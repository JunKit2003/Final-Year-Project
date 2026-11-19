# Containers, package upgrade and storefront revamp design

Acceptance spec: [containers-revamp-spec.md](../containers-revamp-spec.md)

## 1. Summary & goal

- **Containerise** the whole app: MySQL, the Express API and the storefront (nginx) run with one `docker compose up`.
- **Upgrade** every package to its current major: React 19, Vite 8 (replacing Create React App), React Router 8, MUI 9, Express 5, Stripe SDK 23, multer 2, bcrypt 6, nodemailer 10, vitest 5.
- **Redesign** every shopper-facing page ("Trail Lab": carbon/bone, hi-vis lime, expanded type, topo-map texture), with dark and light themes.
- **Ship** through GitHub Actions: tests and image builds on every PR, deploy to a VM on `main` once enabled.

### Answers to the open questions

- **Why Vite?** CRA is deprecated and can't run React 19 properly.
- **MUI?** Storefront is hand-built; admin keeps its MUI screens (upgraded, re-themed to match), loaded only on admin routes.
- **Where does it deploy?** Same pattern as the Portfolio and ConsignCars sites: SSH to a VM with a pinned host key. Images go through GHCR.

## 2. Scope

**In scope**
- `docker-compose.yml`, both Dockerfiles, nginx config, `.env.example`.
- Frontend: Vite migration, new design system, every storefront page rewritten, shared session/cart/catalog state, unit tests, ESLint 10.
- Backend: dependency upgrades, Express 5 and Stripe API changes, container settings (`PUBLIC_URL`, `ASSET_BASE_URL`, `TRUST_PROXY`, `COOKIE_SECURE`, `CORS_ORIGINS`, `DATABASE_PORT`), `/api/health`.
- `.github/workflows/ci-cd.yml`, `deploy/deploy.sh`, `docs/deploy-vm-setup.md`.

**Out of scope**
- Admin feature changes (only the upgrade fixes needed to keep it running).
- Database migrations or a seed dump (none exists in the repo).
- Provisioning the VM for bikeshop.junkit.my (handled separately; this PR ships everything it needs).

**Definition of Done**
- `docker compose up` gives a working shop on a fresh machine.
- Backend 111/111 and frontend 15/15 tests pass; lint passes with zero warnings.
- A push to `main` can deploy with no manual step once the VM is set up, and a failed health check rolls back.

**Also in this delivery**
- Checkout redirects to the Stripe-hosted page via the session `url` (Stripe.js `redirectToCheckout` is gone).
- Missing `STRIPE_SECRET_KEY` no longer crashes the API; checkout answers 503.
- Two previously failing backend tests fixed (test data lacked `phoneNumber`).
- **Security fixes** (found during this work, all pre-existing):
  - Signup ignored the role check: posting `"category":"Admin"` created an admin. The server now always creates `Customer`.
  - Only 1 of 28 routes checked the session. Admin routes now require an admin session; cart and order routes require the signed-in user's own id (`middleware/auth.js`), and cart lines are checked against their owner.
  - The first admin was seeded with the public password `admin` (also in the README). It now comes from `ADMIN_INITIAL_PASSWORD` or is random; `ADMIN_EMAIL` sets a real inbox.
  - Login replied before the session was stored, so the next request could be anonymous (11 of 20 in a test). It now waits, and regenerates the session id to stop session fixation.
  - The API refuses to start in production without `SESSION_SECRET`; `/account/testEmail` is admin-only.

## 3. Architecture & data ownership

### Who owns what

| Thing | Owner | Notes |
|---|---|---|
| Storefront + admin SPA | `frontend` container (nginx) | Static Vite build; proxies `/api/` and `/images/` to the API |
| API | `backend` container, port 8000 (internal) | Express 5, sessions in MySQL (`Sessions` table) |
| Data | `db` container, `db-data` volume | MySQL 8.4; tables synced by Sequelize on start |
| Uploaded images | `images` volume at `/app/images` | Seeded from the bundled images on first start |
| Images (registry) | GHCR `<owner>/<repo>-backend`, `-frontend` | Tagged with the 12-char commit SHA, plus `latest` on `main` |
| Secrets | `.env` on the VM; GitHub secrets for SSH only | Never in images or the repo |

### The rules that fall out of this

- **One origin.** The browser only talks to the frontend container; image URLs are relative (`ASSET_BASE_URL=""`), so there's no CORS and cookies just work.
- **API is never published.** Only nginx has a host port, bound to `127.0.0.1` by default.
- **Nothing ships unless CI passes.** Deploy needs the test and image jobs.
- **Releases are immutable tags.** Deploy pulls `:<sha>`; rollback is starting the previous tag, which `deploy.sh` does automatically on a failed health check.
- **Stripe is pinned.** API version `2026-11-18.endive`, set where the client is created (`config/stripe.js`).

### Changes to existing behaviour

| Thing | Before | After |
|---|---|---|
| Stripe return URL | `HOST:PORT_FRONTEND` | `PUBLIC_URL` (falls back to the old form) |
| Product/banner image URLs | absolute `HOST:PORT_SERVER/...` | `ASSET_BASE_URL` (compose: relative) |
| CORS | reflects any origin with credentials | same, unless `CORS_ORIGINS` is set |
| Session cookie | never `Secure` | `Secure` when `COOKIE_SECURE=true` |
| Who can call what | everything public except fulfilling orders | public: catalogue, banners, auth. Signed-in self: own cart and orders. Admin: catalogue changes, all orders |
| Signup role | taken from the request | always `Customer` |
| First admin password | `admin` | `ADMIN_INITIAL_PASSWORD` or random |
| Frontend env | `REACT_APP_BACKEND_HOST`, `REACT_APP_STRIPE_PUBLIC_KEY` | `VITE_API_URL` (optional; empty = same origin); Stripe key no longer needed in the browser |

No database migration.

## 4. Product-visible behaviour & copy

- Home: banner slideshow hero ("Built for Kiara dirt."), live "Shop open now" status, brand wall, in-stock products, categories, visit section with map and hours.
- Catalog filters (search, category, brand, price, in stock, sort) live in the URL; `/catalog/<brand>` still works.
- Product page: gallery with zoom, option chips, stock meter, quantity, WhatsApp "Ask about this part".
- Cart selects every buyable line by default; out-of-stock lines can't be selected.
- Checkout without Stripe configured: "Online payments are unavailable right now. Please WhatsApp us to complete your order."

## 5. Known limitations

- Admin screens still use their original layouts; only the theme is new. Some admin effects are exempt from the new React Compiler lint rules (listed in `eslint.config.js`).
- The repo has no database dump, so a fresh stack starts with an empty catalogue and the seeded `Admin` account.
- Backend changes deploy with the frontend (one pipeline); there's no zero-downtime blue/green.
- Real Stripe and email flows haven't been run against live keys in this change.
