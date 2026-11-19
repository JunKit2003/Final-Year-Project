# VM agent handoff: deploy Faction Bikeworks to bikeshop.junkit.my

For whoever sets up the server. The app side is finished and merged; this is only the VM and GitHub settings. Background and troubleshooting: [deploy-vm-setup.md](deploy-vm-setup.md).

## Where things stand (2026-11-20)

- `main` is at `632df27`. CI is green.
- Images are already in GHCR:
  - `ghcr.io/junkit2003/final-year-project-backend:632df27dea02` (also `:latest`)
  - `ghcr.io/junkit2003/final-year-project-frontend:632df27dea02` (also `:latest`)
- The **Deploy to VM** job exists but is skipped until the repo variable `DEPLOY_ENABLED=true` is set.
- Nothing is running on the VM yet. The old site at faction.junkit.work is a separate, older install.

## What runs on the VM

```
host nginx :443  (bikeshop.junkit.my, TLS via certbot)
  -> 127.0.0.1:8080  frontend container (nginx: SPA + proxies /api, /images)
       -> backend container :8000 (Express API, not published)
            -> db container (MySQL 8.4, not published)
```

Files in `/opt/faction`: `docker-compose.yml`, `deploy.sh` and `set-admin-password.sh`, which every deploy uploads, plus `.env`, which **you** create. Data lives in the Docker volumes `faction_db-data` and `faction_images`.

## Steps

### 1. Packages and user

```bash
# Docker Engine + compose plugin (official repo), plus:
sudo apt install -y rsync nginx certbot python3-certbot-nginx
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy /opt/faction
```

### 2. `/opt/faction/.env` (owner `deploy`, mode 600)

Start from `.env.example` in the repo. Production values:

```ini
DB_NAME=faction
DB_USER=faction
DB_PASSWORD=<openssl rand -hex 24>
DB_ROOT_PASSWORD=<openssl rand -hex 24>
SESSION_SECRET=<openssl rand -hex 32>

PUBLIC_URL=https://bikeshop.junkit.my
COOKIE_SECURE=true
HTTP_BIND=127.0.0.1
HTTP_PORT=8080

# First admin, used only while the database is empty.
ADMIN_INITIAL_PASSWORD=<strong password, give it to the owner>
ADMIN_EMAIL=<a real inbox, so "Forgot password" works>

STRIPE_SECRET_KEY=<sk_test_... first; switch to live only after a test checkout>

EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<brevo smtp login>
EMAIL_PASSWORD=<brevo smtp key>
# Must be a verified sender in Brevo. Leave empty to use noreply@junkit.work.
EMAIL_FROM=
```

Ask the owner for the Stripe and Brevo values. Never commit this file or paste it into a PR or issue.

### 3. Host nginx + TLS

```bash
sudo cp deploy/nginx/bikeshop.junkit.my.conf /etc/nginx/sites-available/bikeshop.junkit.my   # from the repo
sudo ln -s /etc/nginx/sites-available/bikeshop.junkit.my /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bikeshop.junkit.my
```

DNS for `bikeshop.junkit.my` must point at the VM first. Keep port 8080 closed in the firewall; only 80 and 443 should be public.

### 4. Deploy key

```bash
ssh-keygen -t ed25519 -f faction_deploy -N "" -C "github-actions-faction"   # on a trusted machine
# on the VM: one line in /home/deploy/.ssh/authorized_keys (dir 700, file 600, owner deploy)
restrict ssh-ed25519 AAAA... github-actions-faction
```

### 5. GitHub settings (repo JunKit2003/Final-Year-Project)

| Name | Kind | Value |
|---|---|---|
| `DEPLOY_HOST` | secret | VM hostname or IP, exactly as used with `ssh-keyscan` |
| `DEPLOY_USER` | secret | `deploy` |
| `DEPLOY_SSH_KEY` | secret | private key `faction_deploy` |
| `DEPLOY_KNOWN_HOSTS` | secret | `ssh-keyscan -t ed25519 <host>`, fingerprint checked against the VM |
| `DEPLOY_PORT` | secret | only if SSH isn't on 22 |
| `DEPLOY_ENABLED` | variable | `true` |
| `DEPLOY_PATH` | variable | only if not `/opt/faction` |

Then delete the local private key.

### 6. First deploy

Actions > **CI/CD** > Run workflow on `main` (or push to `main`). The deploy job runs `deploy.sh`, which pulls the `:<sha>` images, starts the stack and waits up to 3 minutes for health checks. If a release is unhealthy it starts the previous tag again and fails the job.

If the pull is denied, go to GitHub > Packages > each `final-year-project-*` package > Package settings > Manage Actions access, and add this repository with read access.

## Verify

```bash
curl -fsS https://bikeshop.junkit.my/api/health            # {"status":"ok"}
cd /opt/faction && docker compose --env-file .env ps        # 3 services healthy
cat /opt/faction/.deployed-tag                              # the deployed sha
```

Then in a browser:

- [ ] Home page loads over HTTPS, with no mixed-content warnings.
- [ ] Sign in as `Admin` with `ADMIN_INITIAL_PASSWORD`, then open `/admin`.
- [ ] As admin, `POST /api/account/testEmail` (or a "Forgot password" request) delivers mail.
- [ ] Add a product with photos in admin. It shows in `/catalog`.
- [ ] Sign up as a customer, add to cart, check out with Stripe test card `4242 4242 4242 4242`. You land on `/paymentSuccess` and the order shows as Paid.
- [ ] Reload a deep link, e.g. `/catalog` or `/viewProduct/<id>`. No 404.

## Don'ts

- Don't publish 8080, 8000 or 3306 to the internet.
- Don't set `COOKIE_SECURE=false` in production. If you're logged out on every click, the proxy isn't sending `X-Forwarded-Proto https`. Fix the proxy instead.
- Don't run `docker compose down -v` on the VM. It deletes the database and uploaded images.
- Don't change passwords with plain SQL. Use `bash /opt/faction/set-admin-password.sh [username]`.

## Housekeeping

- **Backups:** set up a daily `mysqldump` and an images tarball (commands in [deploy-vm-setup.md section 7](deploy-vm-setup.md#7-backups)).
- **Rollback by hand:** `bash /opt/faction/deploy.sh /opt/faction ghcr.io/junkit2003/final-year-project <older-sha> <github-user>`, with a GHCR token on stdin. Previous SHAs are in `.deploy-history`.
- **Old install:** faction.junkit.work may still run the old code with the published `Admin` / `admin`. Change that password or shut it down once bikeshop.junkit.my is live.
- **Not the VM's job:** the open Dependabot PRs (#3 to #7) bump GitHub Actions to new major versions. Review them separately.
