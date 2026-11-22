# Faction Bikeworks Website

## Live Production Site

The full e-commerce website is available at:

**[https://bikeshop.junkit.my](https://bikeshop.junkit.my)**

Please visit the live site to see all features and functionality in action.

## Admin Access

The admin is at `/admin` for accounts with the Admin role. Credentials are not published.
On a new install the first admin's password comes from `ADMIN_INITIAL_PASSWORD` (or is generated and
printed once in the backend logs); change it any time with `deploy/set-admin-password.sh`.

Everything a shopper sees is managed from the admin:

- **Dashboard:** orders to ship, low stock, refunds waiting for Stripe, sales for 7 and 30 days.
- **Orders:** search and filter, ship (with courier and tracking), complete, cancel, refund through Stripe, staff notes and a timeline.
- **Products:** full-page editor (variants table, photos per variant, specs, draft/live/archived, featured, sale price, low-stock alert), bulk actions, CSV import (with a dry run) and export.
- **Stock:** checkout holds stock for 30 minutes; every change is logged with a reason; adjust with a reason; shop-wide stock log.
- **Categories & brands:** rename or merge, brand logos, visibility and order. **Banners:** home hero photos, order, alt text, links.
- **Site content:** every storefront section's text, images and show/hide, with live previews. **Shop settings:** contact details, opening hours and closed dates, chatbot, SEO titles, theme colours (with a readability check) and email wording.
- **Customers:** orders and spend, roles, deactivate. **Activity:** who changed what.

Design and acceptance spec: [docs/plans/2026-11-22-admin-revamp-design.md](docs/plans/2026-11-22-admin-revamp-design.md), [docs/admin-revamp-spec.md](docs/admin-revamp-spec.md).

## Run it locally (Docker)

```bash
cp .env.example .env      # set DB_PASSWORD, DB_ROOT_PASSWORD, SESSION_SECRET
docker compose up -d --build --wait
open http://localhost:8080
```

MySQL and Express run in two containers. Express serves the storefront and API on one published port. Data and uploaded images live in Docker volumes. Add a Stripe test key (`STRIPE_SECRET_KEY=sk_test_...`) to enable checkout.

Schema changes run automatically on start (`src/Backend/database/migrations/`, after `sequelize.sync` creates any new tables). For a demo catalogue built from the bundled photos, run `docker compose exec backend npm run seed:demo` (only fills an empty shop).

Payments are confirmed by the success page; also set `STRIPE_WEBHOOK_SECRET` and point a Stripe webhook at `<site>/api/stripe/webhook` (events `checkout.session.completed`, `checkout.session.expired`) so a closed tab can't lose a payment. Locally: `stripe listen --forward-to localhost:8080/api/stripe/webhook`.

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

`.github/workflows/ci-cd.yml` tests every PR, builds and pushes the app image to GHCR, and deploys `main` to a VM once enabled. Setup and rollback: [docs/deploy-vm-setup.md](docs/deploy-vm-setup.md). Server handoff checklist for bikeshop.junkit.my: [docs/VM-AGENT-HANDOFF.md](docs/VM-AGENT-HANDOFF.md). Design and acceptance spec: [docs/](docs/).
