# Admin panel revamp design

Acceptance spec: [admin-revamp-spec.md](../admin-revamp-spec.md)

## 1. Summary & goal

The admin panel was built during the original final-year project, under time pressure and while learning the stack. It only covers products, banners, orders and brand images, and editing a product is painful. Everything else a visitor sees (shop details, hours, every page's copy, colours) is hard-coded. The goal: **the shop owner can change everything a visitor sees from the admin, without touching code**, and product editing becomes fast and safe.

- **Rebuild** the admin as its own routed area (`/admin/...`) in the storefront's "Trail Lab" design system. Drop MUI.
- **Make site content editable.** Every storefront section's text, images and visibility, plus shop details, hours, socials, map, chatbot link, page titles, theme colours and the password-reset email.
- **Replace the product editor** with a full-page editor: spreadsheet-style variants, drag-and-drop photos per variant, status, featured, sale price, specs, live preview, bulk actions and CSV import/export.
- **Add** a dashboard, better order management, customer management, and category/brand management.
- **Make stock trustworthy.** Checkout holds stock so the last unit can't be sold twice, every change to a stock count is recorded with a reason, and admins adjust stock with a reason instead of overwriting the number.
- **Fix** two data-safety bugs: deleting a product erases it from past orders, and schema changes never reach the live database.

### Answers to the open questions

- **How far does "everything" go?** Content and settings, not a page builder. Page layouts stay hand-built. Every text, image, link and section on/off switch is editable. Functional microcopy (button labels like "Add to cart", form errors, validation text) stays in code.
- **Keep MUI?** No. The admin is rebuilt on the storefront's CSS tokens, so previews match the live site and MUI/Emotion leave the bundle.
- **Headless CMS?** No. One settings table in the existing MySQL. No extra container.

## 2. Scope

**In scope**
- Admin shell: routes, nav, auth guard, toasts, confirm dialogs, unsaved-changes guard, mobile layout.
- Dashboard, Products (list + editor + CSV), Categories & Brands, Banners, Orders, Customers, Site content, Shop settings, Theme, Emails, Activity log.
- Backend: migrations, `/api/admin/*` endpoints, public `/api/site` endpoint, order-line snapshots, product media table.
- Storefront: read all content and settings from `/api/site`, hide draft and archived products, show sale prices and specs.

**Out of scope**
- Page builder (adding, removing or reordering page layouts), creating new pages.
- Multi-currency, discounts/coupons, shipping rates, tax.
- Image resizing or CDN (uploads are stored as sent, after type and size checks).
- Translating the site into other languages.
- Fine-grained admin roles (there is still just Admin and Customer).

**Definition of Done**
- With a fresh database, the storefront looks and reads exactly as it does today (defaults equal the current hard-coded values).
- Every item in §4 can be changed from the admin and shows on the storefront after save, with no redeploy.
- Running migrations on the seeded test database keeps every product, image, order and account.
- Deleting or archiving a product never changes any existing order.
- Backend and frontend tests pass, lint passes with zero warnings, and `npm run build` contains no `@mui` or `@emotion` code.

**Also in this delivery**
- Order lines store a snapshot (product name, variation name, SKU, unit price), and their foreign keys stop cascading.
- `shopStatus()` reads the editable hours and closed dates instead of hard-coded times.
- Optimistic concurrency on product and settings saves: a stale save gets a 409 (conflict) and the admin is told someone else changed it.

**Also out of scope**
- Migrating the old Botpress chatbot to anything else. Only its URL becomes editable.

## 3. Architecture & data ownership

### Who owns what

| Thing | Owner | Notes |
|---|---|---|
| Schema changes | `src/Backend/database/migrations/NNN-*.js` via Umzug | Run at startup **after** `sequelize.sync` (which creates brand-new tables); each migration checks before it changes anything, so fresh and old databases end up the same |
| Site content & settings | `site_settings` table: `key` (PK), `value` JSON, `updatedAt`, `updatedBy` | One row per group (`shop`, `hours`, `theme`, `seo`, `emails`, `content.home.hero`, ...) |
| Setting shapes + defaults | `src/shared/site-schema.js` | One source of truth, imported as `../shared/site-schema.js` by backend (validation) and frontend (fallback). The Dockerfile adds `COPY shared/ /shared/` to both stages (build context is `src`, workdirs are `/app`), so the relative path resolves locally and in the image |
| Product photos | `product_media`: `id`, `variationId`, `path`, `position`, `alt` | Files at `images/product_images/<productId>/<variationId>/<mediaId>.<ext>`. Keyed by variation id, not SKU |
| Product fields | `products` + `status` (`draft`/`live`/`archived`, default `live`), `featured`, `specs` JSON, `lowStockThreshold` (default 3), `version` | |
| Variant fields | `variations` + `compareAtPrice`, `position`, `archivedAt` | `price` is always what the shopper pays (checkout and `unitPrice` use it). `compareAtPrice` is the optional old price shown struck through, and must be greater than `price` |
| Order history | `order_items` + `productName`, `variationName`, `sku`, `unitPrice` | `variationId` FK becomes `ON DELETE SET NULL`, nullable |
| Order payment | `orders` + `stripeSessionId`, `stripePaymentIntentId`, `paidAmount`, `refundedAmount`, `courier`, `trackingNumber`, `version` | Session id saved at checkout; intent and amount saved when paid |
| Refunds | `order_refunds`: `id`, `orderId`, `amount`, `reason`, `status` (`pending`/`succeeded`/`failed`), `stripeRefundId`, `error`, `actorId`, timestamps | `refundedAmount` counts succeeded + pending, so a pending refund still holds its amount |
| Stripe events | `stripe_events`: `eventId` (PK), `type`, `receivedAt` | Webhook idempotency |
| Order notes & timeline | `order_events`: `orderId`, `type` (`status`/`note`/`refund`/`email`), `fromStatus`, `toStatus`, `note`, `actorId`, `createdAt` | Notes are staff-only |
| Stock count | `variations.stock` = units available to sell now | Changed only through one `adjustStock(variationId, delta, reason, ref)` function, using a conditional `UPDATE ... SET stock = stock + :delta WHERE id = :id AND stock + :delta >= 0` |
| Stock history | `stock_movements`: `id`, `variationId`, `delta`, `stockAfter`, `reason` (`checkout_hold`, `hold_released`, `cancel_restock`, `received`, `damaged`, `count_correction`, `import`, `initial`), `orderId`, `note`, `actorId`, `createdAt` | Written in the same transaction as the stock change |
| Customers | `account` + `isActive` (default true) | Inactive accounts can't sign in |
| Banners | `banner_images` + `position`, `alt`, `linkUrl`, `isActive` | |
| Brands | `brand_images` (existing `isVisible`) + `position` | |
| Admin activity | `admin_activity`: `actorId`, `action`, `entity`, `entityId`, `summary`, `createdAt` | Written by admin endpoints, newest 500 shown |

### The rules that fall out of this

- **The storefront never breaks on missing settings.** `/api/site` returns stored values deep-merged over defaults. The frontend boots with bundled defaults and swaps in the fetched values, so first paint never waits on the API.
- **Validation lives in the schema.** Each settings group declares fields (type, max length, required, allowed values). The backend rejects unknown keys and bad values with a 400 that names the field. The admin form is generated from the same declarations.
- **Things that have been ordered are never hard-deleted.** A product or variation referenced by an order line can only be archived. Delete is offered only when nothing references it. Archived products vanish from the storefront but stay in the admin under an "Archived" filter.
- **Drafts are invisible to shoppers.** Public product endpoints return `live` only. `/viewProduct/:id` for a draft or archived product shows the 404 page to shoppers and the product, with a banner, to admins.
- **Migrations are forward-only and idempotent.** Each one checks whether its change already exists, so it's safe on the live database and on a fresh one. The image migration moves files from `<productId>/<sku>/` to `<productId>/<variationId>/` and creates `product_media` rows. It logs every file it can't map and leaves those files in place.
- **Theme colours are constrained.** The admin edits the accent, accent-ink and hot colours for each mode. `--accent-text` and `--accent-glow` are derived from the accent (accent-text is darkened until it passes on the page background). The save is refused if the WCAG contrast ratio (the standard readability score) is below 4.5 for accent-ink on accent, or for accent-text on the background. They are applied as CSS custom properties on `:root` from `/api/site`.
- **Orders follow the pet-hotel-reservation booking admin.** Fulfilment status and money are tracked separately:
  - **Status moves:** Pending → Paid (Stripe only), Paid → Shipped (optional courier + tracking number), Shipped → Completed, Completed → Shipped (reopen). Cancel is allowed from Pending, Paid or Shipped. Any other move is a 409.
  - **Refunds from the admin:** full or partial, reason required, at most paid − already refunded. Each one is an `order_refunds` row created as `pending` *before* Stripe is called, with the row id as the Stripe idempotency key, so a retry can never refund twice. Stripe is never called inside a database transaction. Pending refunds are re-checked with Stripe when the order is opened and on a 60-second sweep.
  - **Cancel** asks for a reason and a refund amount (prefilled with the remaining paid amount, editable down to 0) and has a "Put items back in stock" box (on by default).
  - **Payment state** is shown next to the status: Unpaid / Paid / Partly refunded / Refunded, worked out from paid and refunded totals.
  - **Every action needs the order's `version`** (stale → 409), writes an `order_events` row, and is logged in admin activity.
  - **Emails:** the customer is emailed on Shipped (with tracking), Cancelled (with any refund) and Refunded. The wording lives in the `emails` settings. Emails are sent after commit; a failed send adds an "Email failed" timeline entry and never undoes the action.
  - **Stripe webhook:** `checkout.session.completed` marks the order Paid even if the shopper closes the tab before the success page. Events are deduplicated in `stripe_events`. Without `STRIPE_WEBHOOK_SECRET` the old success-page confirmation still works on its own.
- **Stock is held at checkout, not at payment.** `createOrder` takes each line's quantity off `stock` inside its transaction (`checkout_hold`). If any line can't be covered, the whole order is refused with "Only N of <item> left" and nothing is held. The Stripe session gets `expires_at` = now + 30 min.
  - Paying keeps the hold: no second deduction (this replaces today's deduction in `markOrderPaidAndClearCart`).
  - An expired or abandoned checkout releases it (`hold_released`). This happens through the `checkout.session.expired` webhook, the customer's cancel, and a 60-second sweep of Pending orders older than 35 minutes. The sweep is the same loop as the refund re-check.
  - Cancelling a paid or shipped order restocks only when "Put items back in stock" is ticked (`cancel_restock`).
  - Each order line records its movement, so a release or restock can never be applied twice.
- **Admins adjust stock with a reason, never by overwriting it blind.** The editor and the list's quick edit send "set to N" plus a reason (Received delivery / Damaged or lost / Count correction). The server turns that into a delta against the stock it read, refuses with a 409 if stock moved in the meantime (for example a sale), and records the movement. CSV import records `import` movements the same way.
- **The storefront's stock message uses the product's low-stock threshold**, not a fixed 3. The cart can't go above what's available, and checkout re-checks.
- **Migrations are proven on the bundled data.** This is a final-year project with no production data to protect. Migrations are tested against the repo's bundled images plus a seeded database, and against an empty one.
- **SKUs are unique across the shop.** Enforced in the API. The migration adds a unique index only when no duplicates exist; otherwise it lists them in the log and the dashboard shows "Fix duplicate SKUs" until they're resolved.
- **Every admin write is admin-only and logged.** All `/api/admin/*` routes sit behind `requireAdmin`. An admin can't demote or deactivate themselves, or remove the last active admin.

### Endpoints

| Method & path | Purpose |
|---|---|
| `GET /api/site` | Public. Merged settings and content. `Cache-Control: no-cache` + ETag |
| `GET/PUT /api/admin/settings/:key` | Read/replace one settings group (`version` required on PUT) |
| `GET /api/admin/dashboard` | Counts: orders to fulfil, low-stock variants, sales 7/30 days, recent orders |
| `GET /api/admin/products` | Paged list with `q`, `status`, `category`, `brand`, `stock=low\|out`, `sort` |
| `GET/POST /api/admin/products`, `GET/PUT/DELETE /api/admin/products/:id` | JSON product + variants. DELETE refuses (409) when ordered |
| `POST /api/admin/products/:id/duplicate` | Copy as draft, SKUs suffixed `-COPY` |
| `POST /api/admin/products/bulk` | `{ids, action: status\|category\|brand\|delete, value}` |
| `PATCH /api/admin/variations/:id` | Quick price edit from the list (`version` required) |
| `POST /api/admin/variations/:id/stock` | `{setTo, expected, reason, note?}`. 409 if current stock ≠ `expected` |
| `GET /api/admin/variations/:id/stock-movements`, `GET /api/admin/stock-movements` | Per-variant history, and a shop-wide log filterable by reason, date and SKU |
| `POST /api/admin/variations/:id/media`, `PATCH /api/admin/media/order`, `DELETE /api/admin/media/:id` | Upload one image (jpg/png/webp, 5 MB max), reorder, remove |
| `GET /api/admin/products/export.csv`, `POST /api/admin/products/import?dryRun=1` | CSV, one row per variant: `product_id, product_name, brand, category, status, featured, description, variant_name, sku, price, compare_at_price, stock, intended_use`. Matching SKU updates that variant. New SKU with a `product_id` adds a variant to that product. Rows with a blank `product_id` are grouped by name + brand into new **draft** products. Variants missing from the file are left alone. Dry run returns created/updated/error rows per line |
| `GET /api/admin/taxonomy`, `POST /api/admin/taxonomy/rename` | Categories/brands with counts. Rename or merge rewrites products and brand rows |
| `GET/POST/PUT/DELETE /api/admin/banners[/:id]`, `PATCH /api/admin/banners/order` | |
| `GET/PUT /api/admin/brands[/:id]`, `PATCH /api/admin/brands/order` | Logo, visibility, order |
| `GET /api/admin/orders` | Filters in the URL: `status`, `payment`, `from`, `to`, `q` (order id, name, email, phone, SKU). Paged, newest first |
| `GET /api/admin/orders/:id` | Items (snapshot), customer, payment summary, refunds, timeline, notes. Re-checks pending refunds first |
| `POST /api/admin/orders/:id/ship` / `complete` / `reopen` | `{version, courier?, trackingNumber?}` |
| `POST /api/admin/orders/:id/cancel` | `{version, reason, refundAmount, restock}` |
| `POST /api/admin/orders/:id/refunds` | `{version, amount, reason}` |
| `POST /api/admin/orders/:id/notes` | `{note}` |
| `POST /api/stripe/webhook` | Raw body, signature checked with `STRIPE_WEBHOOK_SECRET` |
| `GET /api/admin/customers`, `GET /api/admin/customers/:id`, `PATCH /api/admin/customers/:id` | Role and `isActive` only |
| `GET /api/admin/activity` | Newest first, paged |

### Changes to existing endpoints

| Endpoint | Change |
|---|---|
| `POST /api/product/get` | Returns `live` products only; adds `featured`, `specs`, `compareAtPrice`, and images from `product_media` (same `images.files` shape) |
| `POST /api/banner/get`, `POST /api/product/getBrandImages` | Active/visible only, in `position` order, with `alt`/`linkUrl` |
| `POST /api/account/login` | Refuses inactive accounts with the same message as a wrong password |
| `POST /api/account/requestPasswordReset` | Subject and body come from the `emails` settings (`{{name}}`, `{{link}}` placeholders) |
| `POST /api/cart/markOrderPaidAndClearCart` | Shares one "mark paid" function with the webhook (whichever comes first wins, the other is a no-op). Saves the payment intent and paid amount, writes an `order_events` row |
| `POST /api/cart/createOrder` | Holds stock (refuses the whole order if any line is short), writes the order-line snapshot, saves `stripeSessionId`, and sets a 30-minute session expiry |
| `DELETE /api/cart/cancelOrder` | Releases the hold for a Pending order instead of only deleting it |
| Old admin writes (`/product/add\|edit\|delete`, `/banner/add\|delete`, `/product/updateBrandImage`, `/cart/getOrders`, `/cart/fulfillOrders`) | Removed once the new admin replaces them, along with their tests |

Migrations (stock: `010-stock-movements` adds the table plus one `initial` movement per variant, so history starts from today's counts): `001-baseline`, `002-order-item-snapshot`, `003-product-status-and-variant-fields`, `004-product-media` (moves files), `005-site-settings`, `006-order-payments-refunds-events` (orders columns, `order_refunds`, `order_events`, `stripe_events`), `007-account-active`, `008-banner-brand-order`, `009-admin-activity`. Orders that predate `stripeSessionId` show "Refund in the Stripe dashboard" instead of the Refund button.

## 4. Product-visible behaviour & copy

**Admin navigation:** Dashboard · Orders · Products · Categories & brands · Banners · Site content · Shop settings · Customers · Activity · View site. The admin user menu has Sign out.

**Products list:** search box "Search name, brand or SKU". Filter chips: All · Live · Draft · Archived · Low stock · Out of stock. Each row shows a thumbnail, name, brand, category, variant count, price range, total stock, status pill and featured star. Stock and price edit inline on click. Selecting rows shows a bulk bar: "Set status", "Change category", "Change brand", "Delete". Buttons: "Import CSV", "Export CSV", "New product".

**Product editor** (`/admin/products/new`, `/admin/products/:id`), two columns. On mobile, the preview drops below the form.
- Left column: **Basics** (Name, Brand and Category with suggestions and "Create '<text>'", Description with line breaks kept), **Variants** table (Name, SKU, Price, Was price (optional), Stock, Intended use, with drag to reorder, "Add variant" and "Duplicate row"), **Photos** (one strip per variant: drop zone "Drop photos or click to upload", drag to reorder, first is the cover, "Copy photos from…"), **Specs** (label/value rows), **Visibility** (Status, Featured, Low-stock alert at).
- Right column: a live product card and a mini product page, using the real storefront components.
- **Stock** cell per variant: the number, a "History" link (a drawer listing each movement: when, change, stock after, reason, order link, who), and an "Adjust" popover (New stock, Reason, Note). The "Low stock" and "Out of stock" filters use each product's threshold.
- Sticky bar: "Unsaved changes" · "Discard" · "Save". Plus "Duplicate", and "Archive" or "Delete" (whichever applies).
- Errors sit under the field, e.g. "SKU DMR-RED is already used by DMR Vault (Red)". Leaving with unsaved changes asks "Leave without saving?".
- Conflict: "Someone else saved this product since you opened it. Reload to see their changes."

**Orders list** (`/admin/orders`): search "Search order, customer, phone or SKU", Status select (All statuses, Pending, Paid, Shipped, Completed, Cancelled), Payment select, From/To dates, "Clear filters". Columns: Order #, date, customer, items, total, status badge, payment badge. Empty: "No orders yet. Orders will appear here as customers check out." or "No matching orders. Try a different search or clear the filters."

**Order detail** (`/admin/orders/:id`). The header shows the order #, status and payment badges, and the actions that apply: "Mark shipped", "Mark completed", "Reopen", "Refund", "Cancel order". Then these panels:
- **Items:** the snapshot, linking to the product if it still exists.
- **Charges:** subtotal, paid, refunded, net.
- **Payments & refunds:** each refund with amount, reason, status and who did it.
- **Customer:** name, email, phone, shipping address, and a link to the customer page.
- **Timeline.**
- **Internal notes:** "Only admins can see these." Placeholder "Add a note for the team…".

Dialogs:
- **Cancel:** "Cancel order #123?" with Paid / Already refunded, "Refund amount (up to RM x)", Reason ("Customer asked to cancel"), and "Put items back in stock". The button is disabled until there's a reason.
- **Refund:** "Issue a refund" with Amount and Reason.
- **Toasts:** "Refunded RM x", or "Refund of RM x requested; waiting for Stripe to confirm."
- **While a refund is pending,** a banner shows and new refunds and cancels are paused.

**Stock log** (`/admin/stock`): the shop-wide movement log, filterable by reason, date and SKU, with a CSV export. The dashboard's "Low stock" card lists variants at or under their threshold, with an inline Adjust.

**Site content** (`/admin/content/:page`): pages Home, About, Footer & header, 404, Sign-in pages. Each section is a card with a "Show this section" toggle, its fields, and a preview of that section rendered with the draft values. Home has hero, brand wall, fresh-in, categories, promise strip (items with an icon from the site's icon set), numbers, and the visit section.

**Shop settings** (`/admin/settings/:group`): Shop details (name, phone, WhatsApp, address, maps link, map embed URL, Facebook, Instagram, coordinates line, founded year), Hours (per weekday: open/close or closed, label text, closed dates with a reason), Chatbot (URL, show floating button), SEO (page titles, meta description), Theme (accent colours per mode, with a live swatch and contrast score), Emails (password reset, order shipped, order cancelled, order refunded: subject/body each, with a placeholder list: `{{name}}`, `{{link}}`, `{{orderId}}`, `{{shopName}}`).

**Storefront:** product pages say "Only N left" at or under the product's threshold, and "Out of stock" at 0. Checkout errors say "Only N of <item> left. We've updated your cart." A sale shows the sale price with the old price struck through. Specs appear as a table on the product page. Featured products lead "Fresh off the truck". On a closed date the open badge says "Closed today: <reason>".

## 5. Known limitations

- No image resizing: large uploads are served as uploaded (5 MB cap).
- Content edits go live on save. There is no draft/scheduled publishing for site content (products do have drafts).
- Activity log keeps who/what/when summaries, not full before/after diffs, and can't undo.
- CSV import doesn't carry photos; photos are added in the editor.
- Refunds go back to the original card only. There are no store credits and no manual cash refunds.
- Two admins editing different settings groups at once is fine. The same group or product gets a conflict message, not a merge.

## Approaches considered

1. **Rebuild the admin on the storefront design system, settings in MySQL (chosen).** One look across the site, lighter bundle, previews use real components. Costs more UI work.
2. **Keep MUI, restyle it.** Faster, but two visual languages and previews that never quite match.
3. **Headless CMS (Strapi etc.).** An extra container and two admin panels to learn. Overkill for one shop.

## Delivery phases (one branch, reviewable commits)

1. Foundation: Umzug migrations, order snapshot + FK fix, admin shell and routing, `site-schema.js`, `/api/site`.
2. Products: list, editor, media, bulk, CSV, taxonomy, storefront visibility/sale/specs.
3. Content & settings: every storefront section reads from settings; content, settings, theme and email screens.
4. Operations: dashboard, orders, customers, banners, brands, activity log.
5. Cleanup: remove old admin components, old endpoints and MUI/Emotion; update README.

## Builder's calls

Visual details inside the Trail Lab system, table/drag libraries (prefer none, or small and dependency-free), CSV parser choice, exact field lengths, and pagination size are left to the builder.
