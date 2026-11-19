# VM setup, deploy and rollback

One-time setup so `.github/workflows/ci-cd.yml` can deploy the containers to your VM. Same SSH pattern as the Portfolio and ConsignCars sites, but the VM runs Docker images pulled from GHCR instead of static files.

```
/opt/faction/
  docker-compose.yml   uploaded by every deploy
  deploy.sh            uploaded by every deploy
  set-admin-password.sh  uploaded by every deploy
  .env                 yours: secrets, never in git
  .deployed-tag        commit SHA that is live
  .deploy-history      one line per deploy
```

Data lives in Docker volumes (`faction_db-data`, `faction_images`), not in this folder.

## 1. Docker and a deploy user (on the VM)

Install Docker Engine with the compose plugin and rsync, then:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy /opt/faction
```

Membership of the `docker` group is effectively root on that VM. Use this key for deploys only.

## 2. Deploy key (on your machine)

```bash
ssh-keygen -t ed25519 -f faction_deploy -N "" -C "github-actions-faction"
```

On the VM, add the public key for `deploy` (`restrict` blocks forwarding and pty; plain commands and rsync still work):

```bash
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "restrict <contents of faction_deploy.pub>" | sudo tee -a /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

## 3. Secrets file (on the VM)

Copy `.env.example` from the repo to `/opt/faction/.env` and fill it in:

- `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `SESSION_SECRET` (`openssl rand -hex 32`).
- `PUBLIC_URL=https://bikeshop.junkit.my` (Stripe returns shoppers here), `COOKIE_SECURE=true` behind HTTPS.
- `STRIPE_SECRET_KEY` (test key first), `EMAIL_*` for password reset codes, and `EMAIL_FROM` set to a sender verified with your SMTP provider (defaults to `noreply@junkit.work`).
- `HTTP_BIND=127.0.0.1` and `HTTP_PORT=8080`, then point the VM's existing nginx (or Cloudflare tunnel) at `http://127.0.0.1:8080`, forwarding `X-Forwarded-Proto`.

```bash
sudo chown deploy:deploy /opt/faction/.env && sudo chmod 600 /opt/faction/.env
```

Ready-made host config: [`deploy/nginx/bikeshop.junkit.my.conf`](../deploy/nginx/bikeshop.junkit.my.conf) (HTTP block; `certbot --nginx -d bikeshop.junkit.my` adds HTTPS). Equivalent server block:

```nginx
server {
    server_name bikeshop.junkit.my;
    # ...existing listen 443 ssl / certificate lines...
    client_max_body_size 100m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. GitHub secrets and the switch

Repo > Settings > Secrets and variables > Actions.

| Name | Kind | Value |
| --- | --- | --- |
| `DEPLOY_HOST` | secret | VM host or IP, exactly as passed to `ssh-keyscan` |
| `DEPLOY_USER` | secret | `deploy` |
| `DEPLOY_PORT` | secret | optional, SSH port if not 22 |
| `DEPLOY_SSH_KEY` | secret | contents of `faction_deploy` (private key) |
| `DEPLOY_KNOWN_HOSTS` | secret | output of `ssh-keyscan` below, fingerprint verified |
| `DEPLOY_PATH` | variable | optional, defaults to `/opt/faction` |
| `DEPLOY_ENABLED` | variable | `true` to turn deploys on |

```bash
ssh-keyscan -p <port> -t ed25519 <vm-host> > known_hosts.txt
ssh-keygen -lf known_hosts.txt     # compare with: ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub on the VM
gh secret set DEPLOY_SSH_KEY < faction_deploy
gh secret set DEPLOY_KNOWN_HOSTS < known_hosts.txt
gh secret set DEPLOY_HOST --body "<vm-host>"
gh secret set DEPLOY_USER --body "deploy"
gh variable set DEPLOY_ENABLED --body "true"
rm faction_deploy known_hosts.txt
```

The deploy job uses the `production` environment, so you can add required reviewers there if you want a manual approval step.

## 5. First deploy

Push to `main` (or run **CI/CD** by hand). The job uploads `docker-compose.yml` and `deploy.sh`, logs the VM into GHCR with the job's short-lived token, pulls `:<sha>`, starts it and waits for health checks.

On a fresh database the API creates one account, `Admin`. Its password is `ADMIN_INITIAL_PASSWORD` from `.env`, or, if that's empty, a random one printed once in `docker compose logs backend`. Set `ADMIN_EMAIL` to a real inbox so "Forgot password" works for it. To change the password at any time:

```bash
cd /opt/faction && bash set-admin-password.sh        # prompts twice, hashes with the API's bcrypt
```

**Old install (faction.junkit.work, if still running):** the old code seeded `Admin` / `admin` and the README published it. Run `set-admin-password.sh` on that server now, even before moving it to containers.

## 6. Rollback

`deploy.sh` rolls back by itself when a release isn't healthy within 3 minutes. To roll back by hand:

```bash
cd /opt/faction
tail -5 .deploy-history                     # pick a previous SHA
echo <ghcr-token> | bash deploy.sh /opt/faction ghcr.io/junkit2003/final-year-project <sha> <github-user>
```

Any `:<sha>` still in GHCR can be redeployed. Database and images stay on their volumes.

## 7. Backups

```bash
docker compose --env-file .env exec -T db sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > faction-$(date +%F).sql
docker run --rm -v faction_images:/data -v "$PWD":/out alpine tar czf /out/images-$(date +%F).tgz -C /data .
```

## 8. Troubleshooting

- **Deploy job skipped:** `DEPLOY_ENABLED` is not `true`, or the run isn't on `main`.
- **Host key verification failed:** `DEPLOY_KNOWN_HOSTS` is stale or missing the `[host]:port` form.
- **`denied` pulling from ghcr.io:** the package isn't linked to this repo. Packages > package settings > Manage Actions access > add this repository.
- **`.env is missing`:** create `/opt/faction/.env` (section 3).
- **Logged out after every click:** `COOKIE_SECURE=true` but the proxy isn't sending `X-Forwarded-Proto https`.
- **Checkout says payments are unavailable:** `STRIPE_SECRET_KEY` is empty in `.env`. Restart with `docker compose --env-file .env up -d`.
- **Building on a network with TLS inspection:** set `NPM_CA_FILE` to your CA bundle before `docker compose build` (only local builds need this; CI builds don't).
