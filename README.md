# Faction Bikeworks Website

## Live Production Site

The full e-commerce website is available at:

**[https://bikeshop.junkit.my](https://bikeshop.junkit.my)**

Please visit the live site to see all features and functionality in action.

## Admin Access

The admin dashboard is at `/admin` for accounts with the Admin role. Credentials are not published.
On a new install the first admin's password comes from `ADMIN_INITIAL_PASSWORD` (or is generated and
printed once in the backend logs); change it any time with `deploy/set-admin-password.sh`.

## Run it locally (Docker)

```bash
cp .env.example .env      # set DB_PASSWORD, DB_ROOT_PASSWORD, SESSION_SECRET
docker compose up -d --build --wait
open http://localhost:8080
```

MySQL, the API and the storefront run as three containers; only the storefront publishes a port. Data and uploaded images live in Docker volumes. Add a Stripe test key (`STRIPE_SECRET_KEY=sk_test_...`) to enable checkout.

### Without Docker

```bash
cd src/Backend && npm install && npm run dev          # needs a MySQL and src/Backend/.env
cd src/factionbikeworks && npm install && npm run dev # http://localhost:3000, proxies /api to :8000
```

### Tests and checks

```bash
cd src/Backend && npx vitest run          # needs a MySQL (see DATABASE* vars); CI provides one
cd src/factionbikeworks && npm run lint && npm test && npm run build
```

### Deploying

`.github/workflows/ci-cd.yml` tests every PR, builds images to GHCR, and deploys `main` to a VM once enabled. Setup and rollback: [docs/deploy-vm-setup.md](docs/deploy-vm-setup.md). Design and acceptance spec: [docs/](docs/).
