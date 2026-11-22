# Admin Panel Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin on the storefront design system so that every visitor-facing text, image, setting, product, order and stock count is managed from `/admin`.

**Architecture:**
- **Backend:** new code lives in feature folders `src/Backend/features/<area>/` (`routes.js`, `service.js`, `*.test.js`), mounted at `/api/admin/*` behind `requireAdmin`. Schema changes go through idempotent Umzug migrations, run after `sequelize.sync()` at boot.
- **Shared settings schema:** one pure-ESM file, `src/shared/site-schema.js`, holds the settings declarations, defaults and validation. Backend and frontend both import it.
- **Frontend:** the new admin lives in `src/factionbikeworks/src/admin/` on the existing CSS tokens. Storefront sections are refactored to take `content` props, so the admin can render them as previews.

**Tech Stack:** Express 5, Sequelize 6 + MySQL 8.4, Umzug 3, Stripe SDK 23, nodemailer, React 19, React Router 8, Vite 8, Vitest 5, supertest.

**Spec:** `docs/plans/2026-11-22-admin-revamp-design.md` + `docs/admin-revamp-spec.md` (story/AC tags `AD0x_ACy`).

## Global Constraints

- No `@mui/*` or `@emotion/*` in `factionbikeworks/package.json` or the build output by the last task.
- Lint: `npm run lint` with `--max-warnings=0` must pass. Backend: `node --check` on every file.
- Currency is MYR, formatted with the existing `formatRM`. Time zone `Asia/Kuala_Lumpur` (UTC+8).
- Photos: jpg/png/webp only, checked by magic bytes, 5 MB max, stored as `<mediaId>.<ext>` under `images/product_images/<productId>/<variationId>/`.
- Stock is only ever changed through `adjustStock`. A Stripe call never runs inside a DB transaction.
- Every editable record carries `version` (integer, +1 per save). A stale write gets 409 `{code:"version_conflict"}`.
- Admin routes: 401 when signed out, 403 for non-admins and for inactive admins.
- Copy strings are exactly as in the design doc §4 and the spec's Gherkin.
- Checkout hold: Stripe `expires_at` = now + 30 min. The sweep releases Pending orders older than 35 min, every 60 s.
- Low-stock threshold default 3. Contrast minimum 4.5:1.

## Review Focus

- **Two admin tabs saving the same settings group:** the second gets a conflict, not a silent overwrite. Test in Task 4.
- **The webhook and the success page arriving together:** the order is paid once and stock isn't touched again. Test in Task 9.
- **A CSV with Windows line endings, a BOM (hidden marker at the start of the file), quoted commas, or a blank trailing line:** parses cleanly. Test in Task 13.
- **Deleting a variant from the editor that is in someone's cart or an old order:** archive or remove from cart, never a database error. Test in Task 11.
- **An emptied required content field** (like the hero headline): refused with a field error, and the storefront keeps the old value. Test in Task 4.

---

## Phase 1: Foundation

### Task 1: Test harness, demo seed and migrations runner

**Files:**
- Create: `src/Backend/database/migrate.js`, `src/Backend/database/migrations/001-baseline.js`, `src/Backend/test/helpers.js`, `src/Backend/scripts/seed-demo.js`, `src/Backend/test/migrate.test.js`
- Modify: `src/Backend/database/index.js` (after `sync`, call `runMigrations`), `src/Backend/package.json` (add `umzug`, script `"seed:demo": "node scripts/seed-demo.js"`)

**Interfaces:**
- Produces: `runMigrations(sequelize): Promise<string[]>` (names applied). Helpers: `hasColumn(qi, table, column)`, `hasTable(qi, table)`, `hasIndex(qi, table, name)` in `migrate.js`.
- Produces (test helpers): `appAs(router, user|null)` returns an express app with JSON, a fake `req.session.user`, and the router mounted at `/`. `ADMIN = {id:1, category:"Admin", isActive:true}`, `CUSTOMER = {id:2, category:"Customer", isActive:true}`. `resetTables(...modelNames)` truncates with FK checks off. `makeProduct({variations:[{sku,stock,price}], ...})` returns `{product, variations}`. `makeAccount(overrides)`.
- Produces: `seedDemo(db, {imagesRoot})` creates 8 demo products from the bundled `images/product_images/<id>/<sku>/` folders (brand/category from a fixed table in the script) when `products` is empty. Used by migration tests and local runs.

- [ ] **Step 1:** Write `test/migrate.test.js`: `it("applies nothing on a second run")`. Run `runMigrations` twice and expect the second result to be `[]`. Also `it("records applied names in SequelizeMeta")`.
- [ ] **Step 2:** Run `npx vitest run test/migrate.test.js` (env from scratchpad `testenv.sh`). Expect FAIL (module missing).
- [ ] **Step 3:** Implement `migrate.js` with Umzug + `SequelizeStorage`. Glob `migrations/*.js`, each `{up({context: qi, sequelize})}`. `001-baseline` is a no-op marker. Wire it into `database/index.js` after `sync`. Add `seed-demo.js`.
- [ ] **Step 4:** Run the backend suite: the new tests plus the existing 111 pass.
- [ ] **Step 5:** Commit `feat(db): add migrations runner and test helpers`.

### Task 2: Order-line snapshot and non-cascading order FKs (AD09-AC3, AC4)

**Files:**
- Create: `src/Backend/database/migrations/002-order-item-snapshot.js`, `src/Backend/test/order-snapshot.test.js`
- Modify: `src/Backend/database/models/orderItem.js` (add `productName`, `variationName`, `sku` STRING nullable; `variationId` nullable, `onDelete: "SET NULL"`; `price` stays the unit price), `src/Backend/api-endpoints/cart/createOrder.js` (write the snapshot), `src/Backend/api-endpoints/tests/cart/createOrder.test.js` (mock expectations)

**Interfaces:** Produces `OrderItem.{productName, variationName, sku}`, used by Tasks 9, 15 and 16.

- [ ] **Step 1:** Write tests:
  - `it("keeps the line after its variation is deleted")`: create an order with an item, destroy the variation, and the item still exists with `variationId === null` and `productName === "DMR Vault"`.
  - `it("backfills snapshot for existing lines")`: insert a line with null snapshot, run the migration's `up`, and expect `sku === "DMR-RED"`.
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** The migration adds the columns if missing, drops and re-adds the `order_items.variationId` FK with `ON DELETE SET NULL` (find the constraint name from `information_schema.KEY_COLUMN_USAGE`), and backfills from a join. Update the model and `createOrder`.
- [ ] **Step 4:** Run the backend suite. PASS.
- [ ] **Step 5:** Commit `fix(orders): keep order history when products change`.

### Task 3: Shared site schema (AD06-AC4, AC5; AD07)

**Files:**
- Create: `src/shared/site-schema.js`, `src/shared/site-schema.test.js` (run by the frontend vitest: add `"../shared/**/*.test.js"` to `test.include`)
- Modify: `src/factionbikeworks/vite.config.js` (`server.fs.allow: [".."]`), `src/factionbikeworks/eslint.config.js` (lint `../shared` too, if the config is path-scoped), `src/Backend/Dockerfile` (`COPY shared/ /shared/` in the `storefront` stage and the final stage)

**Interfaces (Produces):**
- `GROUPS`: object of group key to `{label, fields}`. Field: `{type: "text"|"textarea"|"url"|"link"|"image"|"color"|"bool"|"number"|"list"|"hours"|"dates"|"icon", label, max?, required?, of?: fields (for list), maxItems?, help?}`.
- `DEFAULTS`: object of group key to value. Values are copied verbatim from today's hard-coded copy in `Home.jsx`, `About.jsx`, `Footer.jsx` (`SHOP`), `Header.jsx` (`LINKS`), `App.jsx` (`TITLES`, the NotFound copy), `AuthShell.jsx`, `Chatbot.jsx` (URL), `theme.css` (accent, accent-ink, hot per mode), and `requestPasswordReset.js` (subject/body).
- Group keys: `shop`, `hours`, `seo`, `chatbot`, `theme`, `emails`, `content.home.hero`, `content.home.brands`, `content.home.fresh`, `content.home.categories`, `content.home.promise`, `content.home.numbers`, `content.home.visit`, `content.about`, `content.footer`, `content.header`, `content.notFound`, `content.auth`. Every `content.*` group has `visible: bool` except `content.header`.
- `validateGroup(key, value) → {ok: true, value} | {ok: false, errors: {[path]: message}}`. Unknown keys are dropped. Link fields must match `^(/|https://)`. Placeholders in `emails` are limited to `{{name}} {{link}} {{orderId}} {{shopName}} {{trackingNumber}} {{courier}} {{amount}}`. Theme groups call `contrast()`.
- `mergeSite(stored: {[key]: value}) → full site object` (deep merge over `DEFAULTS`; arrays replace).
- `contrast(hexA, hexB) → number` (WCAG). `deriveAccentText(accent, bg) → hex`, darkened or lightened in 5% steps until ≥4.5, then `#000` or `#fff` as a fallback.
- `shopStatus(hours, now = new Date()) → {open, label}`, moved here from `lib/shop.js`, driven by `hours.days[0..6] {closed, open:"HH:MM", close:"HH:MM"}` and `hours.closures [{date:"YYYY-MM-DD", reason}]`. Labels: "Open now", "Closed now", "Closed today: <reason>". On Sunday with the default hours, "Closed today, gone riding" is kept as `hours.closedLabel`.
- `renderTemplate(str, vars) → string`.

- [ ] **Step 1:** Write tests:
  - `validateGroup("content.home.hero", {...DEFAULTS[...], headline: ""})` fails with `errors["headline.0"] === "Required"` (or the matching path).
  - A link of `"javascript:alert(1)"` gives the error `"Link must start with / or https://"`.
  - `contrast("#c6ff3d", "#0b0c0a") > 4.5`, and a dark accent `#1a1d17` on ink fails with the message `"Text on this colour is hard to read (1.2:1, needs 4.5:1)"` (ratio formatted to 1 decimal).
  - `shopStatus` cases: a weekday at 14:00 MYT is open; Saturday at 17:00 is closed; a closure on 2026-12-25 gives "Closed today: Christmas ride"; Sunday gives "Closed today, gone riding". Move the existing `shop.test.js` shopStatus cases here.
  - An unknown email placeholder `{{foo}}` gives the error `"Unknown placeholder {{foo}}"`.
  - `mergeSite({})` deep-equals `DEFAULTS`.
- [ ] **Step 2:** Run `cd src/factionbikeworks && npm test`. Expect FAIL.
- [ ] **Step 3:** Implement. Make `lib/shop.js` re-export `shopStatus` from the shared file for existing callers until Task 6.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run build`. PASS.
- [ ] **Step 5:** Commit `feat(shared): add site settings schema with defaults and validation`.

### Task 4: Settings storage, public `/api/site` and admin settings API

**Files:**
- Create: `src/Backend/database/models/site_settings.js` (`SiteSetting`: `key` STRING PK, `value` JSON, `version` INT default 1, `updatedBy` INT null), `src/Backend/database/models/admin_activity.js` (`AdminActivity`), `src/Backend/database/migrations/005-site-settings.js` (no-op if sync created it; kept for ordering), `src/Backend/features/settings/{service.js,routes.js,settings.test.js}`, `src/Backend/features/activity/{service.js,routes.js}`, `src/Backend/features/admin-router.js`
- Modify: `src/Backend/routes/routes.js` (mount `/admin` → `admin-router` behind `requireAdmin`; `GET /site`)

**Interfaces:**
- Produces: `getSite() → mergeSite(rows)`, cached in memory and invalidated on write. `getGroup(key) → {value, version}`. `saveGroup(key, value, version, actorId) → {value, version}`, which throws `ConflictError` / `ValidationError(errors)`.
- Produces: `logActivity({actorId, action, entity, entityId, summary}, {transaction}?)`.
- Produces: `features/http.js` with `class HttpError(status, body)`, `ConflictError`, `ValidationError`, `NotFoundError`, and `asyncRoute(fn)` (maps errors to JSON: 400 `{message, errors}`, 404, 409 `{code:"version_conflict", message}`).
- Endpoints: `GET /api/site` (ETag = hash of max version, `Cache-Control: no-cache`, 304 on match), `GET /api/admin/settings/:key`, `PUT /api/admin/settings/:key` `{value, version}`, `GET /api/admin/activity?page=`.

- [ ] **Step 1:** Write tests in `settings.test.js` (real DB, `appAs`):
  - `GET /api/site` on an empty table deep-equals `mergeSite({})`.
  - PUT `shop` with phone `"+6012-345 6789"` and version 1 returns 200 version 2; `/api/site` returns the new phone.
  - PUT with a stale version returns 409 with `code: "version_conflict"` (Review Focus).
  - PUT a hero with an empty headline returns 400 with `errors` naming the field, and `/api/site` still returns the old headline (Review Focus).
  - Admin endpoints return 401 signed out and 403 for a customer (`it.each` over every admin route registered in this task).
  - Activity row written: `action: "settings.update"`, `summary: "Updated Shop details"`.
- [ ] **Step 2:** Run. FAIL.
- [ ] **Step 3:** Implement. Group version: a missing row counts as version 1 with default values. The first save inserts version 2.
- [ ] **Step 4:** Run the backend suite. PASS.
- [ ] **Step 5:** Commit `feat(settings): store site settings and serve /api/site`.

### Task 5: Admin shell, routing, UI kit; MUI admin removed from routing (AD-01)

**Files:**
- Create:
  - `src/factionbikeworks/src/admin/AdminApp.jsx` (routes)
  - `admin/AdminLayout.jsx` (sidebar nav per design §4, mobile menu under 900px, user menu with "Sign out" and "View site")
  - `admin/RequireAdmin.jsx`
  - `admin/lib/adminApi.js`: axios wrappers that throw `{status, code, message, errors}`
  - `admin/lib/useDirtyGuard.js`: blocks in-app nav with `useBlocker` plus `beforeunload`; the prompt is "Leave without saving?" with "Stay"/"Leave"
  - `admin/ui/` primitives: `Button`, `Field`, `TextInput`, `TextArea`, `Select`, `Toggle`, `NumberInput`, `MoneyInput`, `Combobox` (suggest + "Create '<text>'"), `Table`, `Pill`, `Dialog`, `Drawer`, `Popover`, `EmptyState`, `Panel`, `SaveBar` ("Unsaved changes" · "Discard" · "Save"), `ImageDrop`
  - `admin/admin.css` (uses only existing `--*` tokens), `admin/pages/Placeholder.jsx`
- Modify: `src/factionbikeworks/src/App.jsx` (replace the MUI admin routes with `<Route path="/admin/*" element={<AdminApp/>}/>`, lazy-loaded)

**Interfaces:**
- Produces route paths: `/admin` (dashboard), `/admin/orders`, `/admin/orders/:id`, `/admin/products`, `/admin/products/new`, `/admin/products/:id`, `/admin/taxonomy`, `/admin/stock`, `/admin/banners`, `/admin/brands`, `/admin/content/:page` (`home|about|layout|not-found|auth`), `/admin/settings/:group` (`shop|hours|chatbot|seo|theme|emails`), `/admin/customers`, `/admin/customers/:id`, `/admin/activity`.
- Produces: `useAdminQuery(fn, deps) → {data, error, loading, reload}` and `useAdminMutation(fn) → {run, pending}` in `admin/lib/hooks.js`. `toast` comes from the existing `useToast`.

- [ ] **Step 1:** Write `admin/lib/adminApi.test.js`: a 409 response maps to `{status:409, code:"version_conflict"}`, and a 400 maps its `errors`. Write `admin/routes.test.js`: the exported `ADMIN_NAV` lists exactly the design §4 labels in order.
- [ ] **Step 2:** Run `npm test`. FAIL.
- [ ] **Step 3:** Implement. `RequireAdmin` uses `useSession()`: no user redirects to `/`, a non-Admin redirects to `/`. Pages not built yet render `Placeholder`. The old `pages/Admin/*` and `components/Admin/*` stay on disk until Task 22, but are not routed.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run build`. PASS.
- [ ] **Step 5:** Commit `feat(admin): new routed admin shell on the storefront design system`.

### Task 6: Storefront reads `/api/site`; sections take content props (AD06-AC3, AC4; AD07-AC1–AC3)

**Files:**
- Create: `src/factionbikeworks/src/lib/site.jsx` (`SiteProvider`, `useSite()`. Starts from `mergeSite({})`, fetches `/api/site`, applies theme CSS vars on `document.documentElement` via a `<style id="site-theme">` for `[data-theme=dark]` and `[data-theme=light]`, and sets `document.title` from `seo.titles[pathname]`), `src/factionbikeworks/src/components/sections/` (`HomeHero.jsx`, `BrandWall.jsx`, `FreshIn.jsx`, `CategoryGrid.jsx`, `PromiseStrip.jsx`, `Numbers.jsx`, `Visit.jsx`, `AboutStory.jsx`, `AboutContact.jsx`, `FooterBody.jsx`, `NotFoundBody.jsx`), `src/factionbikeworks/src/lib/site.test.js`
- Modify: `Home.jsx`, `About.jsx`, `Footer.jsx` (remove `SHOP`; replace with `useSite().shop`), `Header.jsx` (nav labels, chat link visibility), `App.jsx` (remove `TITLES`; wrap in `SiteProvider`; NotFound uses `NotFoundBody`; `ChatLauncher` hidden when `chatbot.floating === false`), `Chatbot.jsx` (URL from settings), `AuthShell.jsx`, `lib/shop.js` (remove the hard-coded `shopStatus`), `main.jsx` if needed

**Interfaces:**
- Consumes: `mergeSite`, `shopStatus`, `deriveAccentText` from Task 3.
- Produces: each section component is `({content, shop, hours, data})`. `content` is its group value, and `data` is live data (products, brands, banners). It renders `null` when `content.visible === false`. Task 18 renders these same components as previews.
- Produces: `PROMISE_ICONS`, a map of icon name to component (`wrench, shield, truck, package, lock, clock, pin, phone, chat`).

- [ ] **Step 1:** Write `lib/site.test.js`:
  - `themeCss(mergeSite({}).theme)` contains `--accent: #c6ff3d`.
  - `titleFor(site, "/catalog") === "Shop · Faction Bikeworks"`.
  - `titleFor(site, "/viewProduct/3")` falls back to the default title.
- [ ] **Step 2:** Run. FAIL.
- [ ] **Step 3:** Implement, moving markup verbatim into the section components. With defaults, the rendered text must equal today's. Check by eye against `main` with `npm run dev` (Task 23 does the full pass).
- [ ] **Step 4:** Run `npm test && npm run lint && npm run build`. PASS.
- [ ] **Step 5:** Commit `feat(storefront): drive all page content and shop details from site settings`.

## Phase 2: Products and stock

### Task 7: Product, variant and account columns (migration 003, 007, 008)

**Files:**
- Create: `migrations/003-product-status-and-variant-fields.js`, `migrations/007-account-active.js`, `migrations/008-banner-brand-order.js`, `test/schema.test.js`
- Modify models:
  - `products.js`: `status` ENUM(`draft`,`live`,`archived`) default `live`, `featured` BOOL default false, `specs` JSON default `[]`, `lowStockThreshold` INT default 3, `version` INT default 1
  - `variations.js`: `compareAtPrice` DECIMAL(10,2) null, `position` INT default 0, `archivedAt` DATE null, `version` INT default 1; `image_folder_path` becomes nullable
  - `account.js`: `isActive` BOOL default true
  - `banner_image.js`: `position`, `alt`, `linkUrl`, `isActive`
  - `brand_images.js`: `position`
- Unique index `variations_sku_unique`: added only when there are no duplicates. Otherwise log `Duplicate SKUs: A, B` and skip.

- [ ] **Step 1:** Write tests: after the migrations, `describeTable("products")` has every new column. Running the migration on a DB with two variations sharing SKU "X" doesn't throw, and `hasIndex(...) === false`.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run the suite. PASS.
- [ ] **Step 5:** Commit `feat(db): product status, variant, account and ordering columns`.

### Task 8: Stock ledger and `adjustStock` (AD04-AC4, AC5, AC7)

**Files:**
- Create: `models/stock_movements.js` (`StockMovement`), `migrations/010-stock-movements.js` (backfill one `initial` movement per variation where none exists), `features/stock/{service.js,routes.js,stock.test.js}`

**Interfaces (Produces):**
- `adjustStock({variationId, delta, reason, orderId=null, orderItemId=null, note=null, actorId=null}, {transaction}) → {stockAfter}`. Runs `UPDATE variations SET stock = stock + :delta WHERE id = :id AND stock + :delta >= 0`; zero affected rows throws `InsufficientStockError {variationId, available}`. Inserts the movement in the same transaction.
- `REASONS = ["checkout_hold","hold_released","cancel_restock","received","damaged","count_correction","import","initial"]`. `ADMIN_REASONS` maps `received` to "Received delivery", `damaged` to "Damaged or lost", and `count_correction` to "Count correction".
- `StockMovement` has a unique `(orderItemId, reason)` index, so releases and restocks can't double-apply.
- `setStockTo({variationId, setTo, expected, reason, note, actorId})`: compares current stock with `expected` under a `SELECT ... FOR UPDATE`. A mismatch throws `ConflictError("Stock changed to N since you opened this. Check and try again.")`.
- Endpoints: `POST /api/admin/variations/:id/stock`, `GET /api/admin/variations/:id/stock-movements`, `GET /api/admin/stock-movements?reason&from&to&sku&page`, `GET /api/admin/stock-movements.csv`.

- [ ] **Step 1:** Write tests:
  - Adjusting by -2 on stock 1 throws `InsufficientStockError` and leaves stock at 1.
  - `setStockTo` from 1 to 6 with `received` and note "PO 1182" leaves the movement `delta 5, stockAfter 6`.
  - Stale `expected` returns 409 with the exact message, and stock is unchanged.
  - 20 parallel `adjustStock(-1)` calls on stock 5 give exactly 5 successes and final stock 0 (AD04-AC7).
  - A duplicate `(orderItemId, "hold_released")` is rejected.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run the suite. PASS.
- [ ] **Step 5:** Commit `feat(stock): stock ledger with reasons and safe adjustments`.

### Task 9: Order payments, holds, webhook and expiry sweep (AD04-AC1–AC3; AD05-AC8)

**Files:**
- Create: `migrations/006-order-payments-refunds-events.js`, `models/order_refunds.js` (`OrderRefund`), `models/order_events.js` (`OrderEvent`), `models/stripe_events.js` (`StripeEvent`), `features/orders/payment.js`, `features/orders/sweeper.js`, `features/orders/webhook.js`, `features/orders/payment.test.js`
- Modify:
  - `models/order.js`: add `stripeSessionId`, `stripePaymentIntentId`, `paidAmount` DECIMAL default 0, `refundedAmount` DECIMAL default 0, `courier`, `trackingNumber`, `version`
  - `api-endpoints/cart/createOrder.js`: hold stock via `adjustStock(-qty, "checkout_hold", orderItemId)` in its transaction; on `InsufficientStockError`, roll back and return 409 `{message: "Only N of <Product (Variant)> left. We've updated your cart.", variationId, available}`; save `stripeSessionId`; `expires_at`
  - `api-endpoints/cart/markOrderPaidAndClearCart.js`: delegate to `markPaid`
  - `api-endpoints/cart/cancelOrder.js`: release the hold, set Cancelled, no hard delete
  - `server.js`: mount `POST /api/stripe/webhook` with `express.raw({type: "application/json"})` **before** `express.json()`; start `startSweeper()` unless `NODE_ENV === "test"`
  - Their existing tests: update the mocks
  - `.env.example` and `src/Backend/.env.example`: `STRIPE_WEBHOOK_SECRET=`; `docker-compose.yml` passes it through

**Interfaces (Produces):**
- `markPaid(sessionId, {source: "redirect"|"webhook"}) → {order, changed: boolean}`. Locks the order `FOR UPDATE`. If it isn't Pending, returns `changed: false` (idempotent, Review Focus). Otherwise sets Paid, `paidAmount = session.amount_total / 100`, the intent id, clears those cart lines, and writes an `OrderEvent {type:"status", fromStatus:"Pending", toStatus:"Paid"}`. Never touches stock. Fetches the Stripe session *before* opening the transaction.
- `releaseHold(orderId, {reason: "hold_released", actorId}, {transaction})`: for each item with a `checkout_hold` movement and no `hold_released` one, `adjustStock(+qty)`.
- `releaseExpiredHolds(now) → number`: Pending orders with `createdAt < now - 35 min` become Cancelled with the event note "Checkout expired" and their holds released.
- `handleStripeEvent(event)`: inserts `StripeEvent` first (a duplicate means return). `checkout.session.completed` with `payment_status === "paid"` calls `markPaid(webhook)`. `checkout.session.expired` releases the hold and cancels a Pending order. The webhook verifies with `stripe.webhooks.constructEvent` and answers 400 on a bad signature, or 503 when no secret is set.
- `startSweeper({intervalMs = 60000})` runs `releaseExpiredHolds` and `reconcilePendingRefunds` (Task 15).

- [ ] **Step 1:** Write tests (real DB, Stripe mocked through `config/stripe.js`'s `getStripe`):
  - Two concurrent `createOrder` calls for the last unit: one 200, one 409 with "Only 0 of DMR Vault (Red) left. We've updated your cart.", and stock ends at 0 (AD04_AC1).
  - A short line leaves no hold on the other lines.
  - `releaseExpiredHolds` at 36 min restores stock and writes `hold_released`; at 20 min it does nothing.
  - `markPaid` via redirect then webhook leaves a single Paid event and unchanged stock (AD04_AC3, Review Focus).
  - The same Stripe event id twice is processed once.
  - A bad signature gets 400.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run the suite. PASS.
- [ ] **Step 5:** Commit `feat(orders): hold stock at checkout, Stripe webhook and expiry sweep`.

### Task 10: Product media (migration 004)

**Files:**
- Create: `models/product_media.js` (`ProductMedia`), `migrations/004-product-media.js`, `features/media/{service.js,routes.js,media.test.js}`, `file-uploads/imageType.js`
- Modify: `api-endpoints/products/getProducts.js` and `file-uploads/utils.js` (`attachImagesToProduct` reads `ProductMedia` by variation ordered by `position` and returns the same `{files, names}` shape; the SKU-folder fallback is removed)

**Interfaces (Produces):**
- `sniffImage(buffer) → "jpg"|"png"|"webp"|null` (magic bytes).
- `addMedia(variationId, file) → media`: 5 MB limit, otherwise 400 "Photos must be 5 MB or smaller". A bad type gets 400 "Only JPG, PNG or WebP photos".
- `reorderMedia([{id, position, variationId}])`: moving between variants is allowed and moves the file.
- `removeMedia(id)`, `copyMedia(fromVariationId, toVariationId)`.
- Endpoints: `POST /api/admin/variations/:id/media` (multer single `file`, `limits.fileSize` 5 MB), `PATCH /api/admin/media/order`, `DELETE /api/admin/media/:id`, `POST /api/admin/variations/:id/media/copy-from/:fromId`.
- The migration moves `images/product_images/<pid>/<sku>/<file>` to `<pid>/<vid>/<mediaId>.<ext>` for each variation whose SKU folder exists, and logs and leaves unmatched folders. It's idempotent: it skips variations that already have media.

- [ ] **Step 1:** Write tests (temp `IMAGES_ROOT` env, default `images`):
  - The migration on a seeded fixture (2 variants, 3 files) creates 3 rows, the files sit at their new paths, and an orphan folder `<pid>/GHOST/` is left in place and logged.
  - Renaming a SKU keeps its media (AD02_AC3).
  - A 6 MB upload gets 400 with the exact message.
  - A `.png` name with JPEG bytes is stored as `.jpg`.
  - Reordering changes the order of `getProducts` `images.files`.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run the suite. PASS.
- [ ] **Step 5:** Commit `feat(media): store product photos per variant id`.

### Task 11: Admin products API (AD02 backend; AD03-AC1–AC3)

**Files:**
- Create: `features/products/{service.js,routes.js,validate.js,products.test.js}`
- Modify: `api-endpoints/products/getProducts.js` and `database/utils.js` `getProductsFromDB`/`getProductFromDB` (public: `status: "live"` only, non-archived variations ordered by `position`, adds `featured, specs, lowStockThreshold, compareAtPrice`; a single non-live product gets 404 unless `req.session.user` is an admin, in which case it's returned with `status`)

**Interfaces (Produces):**
- `GET /api/admin/products?q&status&category&brand&stock=low|out&sort=updated|name|stock&page&pageSize=25` returns `{items:[{id,name,brand,category,status,featured,variantCount,minPrice,maxPrice,totalStock,lowStockThreshold,thumb,updatedAt}], total}`. `q` matches name, brand or SKU (LIKE). Low means some variant has `0 < stock <= threshold`; out means some variant has `stock = 0`.
- `GET /api/admin/products/:id` returns the full product with `variations[]` (each with `media[]`, `ordered: boolean`), `ordered: boolean`, `version`.
- `POST /api/admin/products` and `PUT /api/admin/products/:id` take `{name, brand, category, description, status, featured, specs:[{label,value}], lowStockThreshold, version?, variations:[{id?, name, sku, price, compareAtPrice, intendedUse, position, stock (create only)}]}`.
  - On update, stock is **ignored** (Task 8 owns stock changes). New variants start with `stock` and an `initial` movement.
  - Removed variants: ordered ones get `archivedAt`, others are destroyed, and their cart rows are removed first (Review Focus).
  - Validation errors are keyed by path: `"Name is required"`; `variations.1.sku` "SKU DMR-RED is already used by DMR Vault (Red)" (checked across the shop and within the payload); `"Was price must be more than the price"`; price ≥ 0.
- `DELETE /api/admin/products/:id` gets 409 `{message: "This product has orders. Archive it instead."}` when ordered.
- `POST /api/admin/products/:id/duplicate` returns `{id}`: a draft copy with SKUs `<sku>-COPY` (`-COPY2`... on a clash), stock 0, media copied.
- `POST /api/admin/products/bulk` takes `{ids, action: "status"|"category"|"brand"|"delete", value}` and returns `{updated, deleted, archivedInstead}`.
- `PATCH /api/admin/variations/:id` takes `{price?, compareAtPrice?, version}`.
- Every write calls `logActivity` (e.g. "Archived product DMR Vault").

- [ ] **Step 1:** Write tests:
  - Create returns 201 and an `initial` movement exists.
  - A duplicate SKU returns 400 with the exact message under `variations.1.sku`.
  - Was price 300 with price 389 returns 400.
  - A stale version returns 409.
  - Deleting an ordered product returns 409; an unordered one returns 204.
  - Removing a variant that's in a cart (unordered) succeeds and removes the cart row.
  - Removing an ordered variant archives it, and it disappears from the public list.
  - Draft is hidden publicly; a single draft gets 404 for a customer and 200 for an admin.
  - Duplicate gives `-COPY` SKUs and draft status.
  - Bulk delete over 3 ids with 1 ordered returns `{deleted:2, archivedInstead:1}`.
  - The search `q=DMR-RED` finds by SKU.
  - 401/403 on every route.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement (one transaction per write). **Step 4:** Run the suite. PASS.
- [ ] **Step 5:** Commit `feat(products): admin products API with status, specs and safe deletes`.

### Task 12: Taxonomy rename/merge (AD03-AC6)

**Files:** Create `features/taxonomy/{service.js,routes.js,taxonomy.test.js}`.
**Interfaces:** `GET /api/admin/taxonomy` returns `{categories:[{name,count}], brands:[{name,count,brandImageId}]}`. Names are grouped case-insensitively for suggestions but returned as stored. `POST /api/admin/taxonomy/rename` takes `{kind:"category"|"brand", from, to}` and returns `{moved}`. A brand merge keeps the target's `BrandImages` row (or renames the source's when the target has none) and deletes the other.

- [ ] **Step 1:** Test: merging "Oneup" (2) into "OneUp Components" (5) leaves 7 products and a single brand_images row. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(taxonomy): rename and merge categories and brands`.

### Task 13: CSV export and import (AD03-AC4, AC5)

**Files:** Create `features/products/csv.js` (a small dependency-free RFC 4180 parser and writer), `features/products/csv.test.js`, routes in `features/products/routes.js`.
**Interfaces:**
- `parseCsv(text) → string[][]` strips a BOM, handles CRLF, quotes and escaped quotes, and drops trailing blank lines. `toCsv(rows) → string`.
- `COLUMNS = ["product_id","product_name","brand","category","status","featured","description","variant_name","sku","price","compare_at_price","stock","intended_use"]`.
- `planImport(rows) → {lines:[{line, action:"update"|"create_variant"|"create_product"|"error", message?, sku}], summary}`.
- `applyImport(plan, actorId)`: one transaction; stock differences go through `adjustStock` with reason `import`.
- Endpoints: `GET /api/admin/products/export.csv`, `POST /api/admin/products/import?dryRun=1` (multer single `file`, 2 MB).

- [ ] **Step 1:** Write tests:
  - `parseCsv("﻿a,b\r\n\"x, y\",\"he said \"\"hi\"\"\"\r\n\r\n")` gives `[["a","b"],["x, y","he said \"hi\""]]` (Review Focus).
  - The spec scenario: 1 update, 1 new variant, and 1 error "Line 4: price must be a number". A dry run changes nothing; applying updates the price and adds the variant.
  - Blank `product_id` rows grouped by name + brand create one draft product.
  - An export round-trip re-imports with 0 changes.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(products): CSV export and import with dry run`.

### Task 14: Products list, editor and stock UI (AD-02, AD-03, AD-04 UI)

**Files:**
- Create:
  - `admin/pages/products/ProductsList.jsx`: URL-param filters; chips All · Live · Draft · Archived · Low stock · Out of stock; search "Search name, brand or SKU"; row selection with a bulk bar; inline price edit; Stock cell opens `StockAdjust`; "Import CSV", "Export CSV", "New product"
  - `admin/pages/products/ProductEditor.jsx`
  - `admin/pages/products/VariantsTable.jsx`: drag handle reorder via HTML5 DnD, "Add variant", "Duplicate row", remove
  - `admin/pages/products/PhotoStrips.jsx`: one strip per saved variant; unsaved variants show "Save to add photos"; "Copy photos from…"
  - `admin/pages/products/SpecsEditor.jsx`
  - `admin/pages/products/ProductPreview.jsx`: renders the storefront `ProductCard` plus a compact product page header from the draft
  - `admin/pages/products/ImportDialog.jsx`: upload, dry-run table, "Import N rows"
  - `admin/pages/stock/StockAdjust.jsx`: popover with New stock, Reason select, Note
  - `admin/pages/stock/StockHistoryDrawer.jsx`
  - `admin/pages/stock/StockLog.jsx` (`/admin/stock`)
  - `admin/pages/products/editorState.js`: pure reducer, plus `diffDirty(initial, current)` and `toPayload(state)`
  - `admin/pages/products/editorState.test.js`
- Modify: `components/ProductCard.jsx` and `pages/ViewProduct.jsx`
  - Show "Was" prices struck through when `compareAtPrice > price`
  - Show a specs table
  - `stockState(stock, threshold)` gives "Only N left" at or under the threshold
  - Show a draft banner "Draft: not visible to shoppers" for admins
  - `lib/shop.js` gets a `stockState(stock, threshold = 3)` signature and a featured-first `"featured"` sort; the existing tests are updated
- Modify: `pages/Cart.jsx` and `pages/CheckoutPage.jsx`: on a 409 from createOrder, show the server message as a toast and reload the cart

**Interfaces:** Consumes the Tasks 8, 10, 11, 12 and 13 endpoints. The editor saves via POST/PUT, then `navigate("/admin/products/:id", {replace:true})` on create. On 409 it shows "Someone else saved this product since you opened it. Reload to see their changes." and keeps the form. Field errors map from `errors` paths. `useDirtyGuard(dirty)`.

- [ ] **Step 1:** Write `editorState.test.js`:
  - Adding then removing a variant leaves `dirty === false`.
  - `toPayload` omits `stock` for existing variants.
  - Duplicating a row clears `id` and appends `-COPY` to the SKU.
  - Reorder rewrites `position` 0..n.
  - Update `shop.test.js` for `stockState(2, 2).label === "Only 2 left"`, `stockState(5, 2).key === "in"`, and `stockState(0).label === "Out of stock"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** Run `npm test && npm run lint && npm run build`. PASS.
- [ ] **Step 5:** Commit `feat(admin): product list, full-page editor and stock tools`.

## Phase 3: Orders

### Task 15: Admin orders API with refunds (AD-05 backend)

**Files:** Create `features/orders/{service.js,routes.js,refunds.js,orders.test.js}`, `features/email/send.js`.
**Interfaces (Produces):**
- `TRANSITIONS = {ship: ["Paid"], complete: ["Shipped"], reopen: ["Completed"], cancel: ["Pending","Paid","Shipped"]}`. Anything else gets 409 `{message: "Can't <action> an order that is <status>."}`.
- `paymentState(order) → "unpaid"|"paid"|"partly_refunded"|"refunded"`, with labels Unpaid / Paid / Partly refunded / Refunded.
- `GET /api/admin/orders?status&payment&from&to&q&page` (q matches order id, recipient name, account email, phone, line SKU).
- `GET /api/admin/orders/:id` calls `reconcilePendingRefunds({orderId})` first, then returns `{order, items, customer, refunds, events, notes, actions: string[], refundable}`.
- `POST /:id/ship {version, courier?, trackingNumber?}`, `/complete {version}`, `/reopen {version}`, `/cancel {version, reason (required), refundAmount, restock}`, `/refunds {version, amount, reason}`, `/notes {note}`.
- Refund flow, `requestRefund(orderId, amount, reason, actorId)`:
  1. In a transaction: lock the order, check `0 < amount <= paidAmount - refundedAmount` (otherwise 400 "Can't refund more than RM x"), check there's no pending refund (otherwise 409 "A refund is still waiting for Stripe to confirm."), insert `OrderRefund {status:"pending"}`, `refundedAmount += amount`, commit.
  2. Outside the transaction: `stripe.refunds.create({payment_intent, amount: sen}, {idempotencyKey: "refund-" + refund.id})`.
  3. Record the result: `succeeded`, `pending` (stays pending), or `failed` (subtract it from `refundedAmount` and write an event). Orders with no `stripePaymentIntentId` get 409 "Refund this order in the Stripe dashboard."
- `reconcilePendingRefunds({orderId?})` retrieves each pending refund older than 0 s by `stripeRefundId` (or re-creates it with the same idempotency key if there's no id).
- Cancel = `releaseHold` (Pending) or `cancel_restock` per line (when `restock`), the status change, then the refund if `refundAmount > 0`, then the email.
- `sendTemplated(templateKey, to, vars) → {ok, error?}` uses `emails[templateKey]` + `renderTemplate`. The caller writes an `OrderEvent {type:"email", note:"Order shipped"}` or `"Email failed: Order shipped"`.
- Also modify `api-endpoints/accounts/requestPasswordReset.js` to use `sendTemplated("passwordReset", ...)`.

- [ ] **Step 1:** Write tests (Stripe and the transporter mocked):
  - `complete` on Paid returns 409.
  - Ship with J&T/JT123456 returns 200; the email vars include tracking; the event is written.
  - A partial refund of 100 on 778 makes the payment state `partly_refunded`, and Stripe is called with `amount: 10000` and idempotency key `refund-<id>`.
  - Refunding 100 when 78 is left returns 400 "Can't refund more than RM 78.00".
  - A pending refund blocks the next one with 409.
  - Cancel with restock and a full refund: stock is back with `cancel_restock` and the state is refunded.
  - A transporter failure still ships, and the event "Email failed: Order shipped" is written.
  - Stale version returns 409.
  - 401/403.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(orders): admin order actions, Stripe refunds and order emails`.

### Task 16: Orders UI (AD-05 UI)

**Files:** Create `admin/pages/orders/OrdersList.jsx`, `OrderDetail.jsx`, `CancelDialog.jsx`, `RefundDialog.jsx`, `ShipDialog.jsx`, `Timeline.jsx`, `NotesPanel.jsx`, `orderUi.js` + `orderUi.test.js` (`actionsFor`, `refundError(amount, max)`, `paymentLabel`).
**Interfaces:** Copy exactly as in design §4 (list empty states, panels, dialogs, toasts, pending banner).

- [ ] **Step 1:** Tests: `refundError(100, 78) === "Can't refund more than RM 78.00"`; `refundError(0, 78)` is an error; `paymentLabel("partly_refunded") === "Partly refunded"`. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** Run `npm test && npm run lint && npm run build`. PASS.
- [ ] **Step 5:** Commit `feat(admin): orders list and detail with refunds, notes and timeline`.

## Phase 4: Content, settings and operations

### Task 17: Settings screens: shop, hours, chatbot, SEO, theme, emails (AD-07 UI)

**Files:** Create `admin/forms/SchemaForm.jsx` (renders any `GROUPS[key].fields`, including `list` add/remove/reorder, `image` via upload, `hours` per weekday, `dates`, `color` with a swatch, `icon` picker from `PROMISE_ICONS`), `admin/forms/useGroup.js` (load/save with version, conflict message "Someone else saved these settings since you opened them. Reload to see their changes."), `admin/pages/settings/SettingsPage.jsx`, `admin/pages/settings/ThemePreview.jsx` (live swatch plus contrast score), and `features/settings` route `POST /api/admin/settings/upload` (image upload for settings, same sniff/limit, stored at `images/site/<uuid>.<ext>`, returns `{url}`).
- [ ] **Step 1:** Backend test for the upload route (type/size). Frontend test `SchemaForm` helper `setAtPath(obj, "items.1.title", v)`. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS (both suites, lint, build).
- [ ] **Step 5:** Commit `feat(admin): shop settings, hours, SEO, theme and email editors`.

### Task 18: Site content screens with live previews (AD-06 UI)

**Files:** Create `admin/pages/content/ContentPage.jsx`. Pages map to groups: `home` → the seven `content.home.*` groups, `about` → `content.about`, `layout` → `content.header` + `content.footer`, `not-found` → `content.notFound`, `auth` → `content.auth`. Each group is a card with "Show this section", `SchemaForm`, and a preview rendering the Task 6 section component with draft values inside a `.site-preview` scope with `data-theme` following the admin mode.
- [ ] **Step 1:** Test: `contentPages.home` lists the seven groups in page order. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS, lint, build.
- [ ] **Step 5:** Commit `feat(admin): edit every storefront section with live previews`.

### Task 19: Banners and brands (AD08-AC4)

**Files:** Create `features/banners/{service.js,routes.js,banners.test.js}`, `features/brands/{service.js,routes.js,brands.test.js}`, `admin/pages/BannersPage.jsx`, `admin/pages/BrandsPage.jsx`. Modify `getBanners.js` and `getBrandImages.js` (active/visible only, by `position`, plus `alt`/`linkUrl`), and `HomeHero` (banner `alt`, wrap in a link if `linkUrl`).
**Interfaces:** `GET/POST /api/admin/banners` (multipart `file`, `alt`, `linkUrl`), `PUT /api/admin/banners/:id {alt, linkUrl, isActive}`, `DELETE /api/admin/banners/:id`, `PATCH /api/admin/banners/order {ids}`; `GET /api/admin/brands`, `PUT /api/admin/brands/:id` (multipart optional `file`, `isVisible`), `PATCH /api/admin/brands/order {ids}`.
- [ ] **Step 1:** Tests: reordering `[3,1,2]` makes the public `getBanners` order 3,1,2; an inactive banner is hidden; a hidden brand is hidden. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(admin): banners and brands with ordering and visibility`.

### Task 20: Customers and inactive login (AD08-AC2, AC3)

**Files:** Create `features/customers/{service.js,routes.js,customers.test.js}`, `admin/pages/customers/CustomersList.jsx`, `CustomerDetail.jsx`. Modify `api-endpoints/accounts/login.js` (an inactive account gets the same response as a wrong password), `middleware/auth.js` (`requireAdmin` re-reads `isActive` and `category` from the DB, cached per request, so a demoted or deactivated admin loses access immediately), and `api-endpoints/tests/accounts/login.test.js`.
**Interfaces:** `GET /api/admin/customers?q&role&active&page`, `GET /api/admin/customers/:id` (with orders and totals), `PATCH /api/admin/customers/:id {category?, isActive?}`. Errors (403): "You can't remove your own admin access", "You can't deactivate your own account", and "There must be at least one active admin".
- [ ] **Step 1:** Tests: demoting yourself returns 403 with the exact message; a deactivated customer logging in gets the wrong-password response; a deactivated admin's next admin call gets 403. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(admin): customer management and account deactivation`.

### Task 21: Dashboard and activity UI (AD08-AC1, AC5)

**Files:** Create `features/dashboard/{service.js,routes.js,dashboard.test.js}`, `admin/pages/Dashboard.jsx`, `admin/pages/ActivityPage.jsx`.
**Interfaces:** `GET /api/admin/dashboard` returns `{toShip, lowStock:[{variationId, productId, name, variant, sku, stock, threshold}], pendingRefunds, sales7, sales30, recentOrders:[...5], duplicateSkus:[sku]}`. Sales = sum of `paidAmount - refundedAmount` for orders paid in the window. The cards link to `/admin/orders?status=Paid`, `/admin/products?stock=low`, and `/admin/orders?payment=pending_refund`. The duplicate SKU card says "Fix duplicate SKUs". Copy: "3 orders to ship", "2 low on stock".
- [ ] **Step 1:** Test: 3 Paid orders and 2 low variants give `toShip 3` and `lowStock.length 2`; a refund reduces `sales7`. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(admin): dashboard and activity log`.

## Phase 5: Cleanup and verification

### Task 22: Remove the legacy admin, legacy endpoints and MUI

**Files:**
- Delete: `src/factionbikeworks/src/pages/Admin/`, `src/factionbikeworks/src/components/Admin/`, the MUI-only components (`ImageUploadUI.jsx`, `FilterSearch.jsx`, `BubbleSelector.jsx`, `PopupDisplay.jsx`, `Loading.jsx`, `LoadingButton.jsx`, `TextFieldWithCounter.jsx`, `Carousel/` if unused, checked with grep)
- Delete the old endpoints, their routes and tests: `addProduct`, `updateProduct`, `deleteProduct`, `addBanner`, `deleteBanner`, `updateBrandImage`, `getOrders`, `fulfillOrders`, plus their `database/utils.js` helpers if unused, and `file-uploads/uploadProductImages.js`, `uploadBannerImages.js`, `uploadBrandImage.js` if unused
- Modify: `package.json` (remove `@mui/*`, `@emotion/*`), README (admin areas, `STRIPE_WEBHOOK_SECRET`, migrations, `npm run seed:demo`), and the design doc ("sync then migrations" order)
- [ ] **Step 1:** Run `grep -rn "@mui\|@emotion" src/factionbikeworks/src` and expect no hits. Run `npm run build && grep -rl "@mui\|emotion" build/` and expect no hits.
- [ ] **Step 2:** Run both suites, lint, and `node --check`. PASS.
- [ ] **Step 3:** Commit `chore: remove legacy admin, old endpoints and MUI`.

### Task 23: End-to-end verification in the containers

- [ ] **Step 1:** `docker compose up -d --build --wait` with a scratch `.env`, followed by `npm run seed:demo` inside the backend container.
- [ ] **Step 2:** Use Playwright to check the storefront home/about/footer text against `main` with empty settings (AD06_AC4), then walk the spec scenarios: AD01 guard, product create with photos, draft hidden, stock adjust, two-tab conflict, content edit live on save, theme contrast refusal, dashboard counts. Use Stripe only if a test key is available; otherwise the mocked tests stand and the report says so.
- [ ] **Step 3:** Fix anything found, with a test for each, and commit.
- [ ] **Step 4:** Do a final whole-branch review with a fresh reviewer, fix the findings, then push the branch and open the PR.
