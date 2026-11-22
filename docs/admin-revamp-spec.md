# Admin panel revamp: acceptance specification

**Product:** Faction Bikeworks web store
**Parent:** none (no work item)
**Date:** 2026-11-22
**Status:** Draft, awaiting approval

Design doc: [plans/2026-11-22-admin-revamp-design.md](plans/2026-11-22-admin-revamp-design.md)

Story labels (e.g. `AD-01`) are provisional, not work item IDs. The Gherkin describes expected behaviour, not passing tests.

## Stories at a glance

- **AD-01 A real admin area:** routed, admin-only, one look with the storefront, works on a phone.
- **AD-02 Edit a product in one place:** full-page editor with variants, photos, specs, status and a live preview.
- **AD-03 Manage the catalogue in bulk:** search, filter, quick edits, bulk actions, CSV in and out, category and brand tidy-up.
- **AD-04 Stock you can trust:** checkout holds stock, every change has a reason, history is visible.
- **AD-05 Run orders end to end:** ship, complete, cancel, refund through Stripe, notes and timeline.
- **AD-06 Edit every page's content:** each storefront section's text, images and visibility.
- **AD-07 Shop settings, theme and emails:** contact details, hours, SEO, chatbot, colours, email wording.
- **AD-08 See and manage the shop:** dashboard, customers, banners, brands, activity log.
- **AD-09 Nothing gets lost:** migrations keep all data, and order history survives product changes.

## Shared definitions and boundaries

- **Admin:** a signed-in, active account with category `Admin`.
- **Live / Draft / Archived:** a product's status. Only Live products are visible to shoppers.
- **Available stock:** `variations.stock`, the units that can still be sold now (held units excluded).
- **Hold:** stock taken off available stock when a checkout starts, for up to 30 minutes.
- **Version:** the number every editable record carries. Saving with an old one is refused with a conflict message.
- **Defaults:** the values the site shows today, used whenever a setting hasn't been saved.

### Out of scope for all stories

Page builder or new pages, discounts, shipping rates, tax, multi-currency, translations, image resizing, fine-grained staff roles, store credit.

## AD-01: A real admin area

**User Story:** As the shop owner, I want a proper admin area with its own pages, so that I can move around, refresh and share links without losing my place.

### Acceptance criteria

**AD01-AC1: Admin only.** Every `/admin` page and `/api/admin/*` call refuses anyone who isn't an active admin.
**AD01-AC2: Real URLs.** Each screen has its own URL, and refresh or back keeps you there.
**AD01-AC3: Unsaved changes guard.** Leaving a form with unsaved changes asks "Leave without saving?".
**AD01-AC4: Same design system.** The admin uses the storefront's tokens in dark and light mode, and the built bundle contains no `@mui` or `@emotion` code.
**AD01-AC5: Phone friendly.** At 375px wide the nav collapses into a menu and every screen is usable without sideways scrolling.

### Gherkin specifications

```gherkin
@AD01
Feature: Admin area

  @AD01_AC1
  Scenario Outline: Non-admins are kept out
    Given I am <who>
    When I open /admin/products
    Then I am sent to the home page
    And GET /api/admin/products answers <code>

    Examples:
      | who                   | code |
      | signed out            | 401  |
      | a signed-in customer  | 403  |

  @AD01_AC2
  Scenario: Refresh keeps my place
    Given I am an admin on /admin/orders?status=Paid
    When I refresh the page
    Then I still see the orders list filtered to Paid

  @AD01_AC3
  Scenario: Leaving with unsaved changes
    Given I changed a product's name and haven't saved
    When I click "Orders" in the admin nav
    Then I am asked "Leave without saving?"
    And choosing "Stay" keeps my edit

  @AD01_AC4
  Scenario: No MUI in the build
    When the frontend is built
    Then no output file contains "@mui" or "@emotion"
```

## AD-02: Edit a product in one place

**User Story:** As the shop owner, I want to edit everything about a product on one page and see how it will look, so that adding a new range takes minutes, not an afternoon.

### Acceptance criteria

**AD02-AC1: One page.** `/admin/products/new` and `/admin/products/:id` hold basics, variants, photos, specs and visibility, plus a live preview built from the real storefront components.
**AD02-AC2: Variants table.** Variants are edited in a table (name, SKU, price, was price, stock, intended use), can be reordered, duplicated and removed.
**AD02-AC3: Photos per variant.** Photos upload by drag and drop or click (jpg, png, webp, 5 MB max each), reorder by drag, and the first is the cover. Renaming a SKU keeps its photos.
**AD02-AC4: No typo duplicates.** Brand and category suggest existing names case-insensitively, and offer "Create '<text>'" only when there's no match.
**AD02-AC5: Clear errors.** Bad input is shown under the field. Examples: a duplicate SKU, a was price not above the price, a missing name.
**AD02-AC6: Status and featured.** Draft and Archived products are hidden from shoppers. Featured products lead "Fresh off the truck".
**AD02-AC7: Safe delete.** A product or variant that has ever been ordered can only be archived. Delete is offered only when nothing refers to it.
**AD02-AC8: No silent overwrite.** Saving over someone else's newer save shows "Someone else saved this product since you opened it. Reload to see their changes."
**AD02-AC9: Duplicate.** "Duplicate" creates a Draft copy with SKUs suffixed `-COPY`, and opens it.

### Gherkin specifications

```gherkin
@AD02
Feature: Product editor

  Background:
    Given I am an admin

  @AD02_AC1 @AD02_AC2
  Scenario: Create a product with variants
    When I open /admin/products/new
    And I fill in name "DMR Vault", brand "DMR", category "Pedals"
    And I add variants "Red" SKU "DMR-RED" price 389 stock 4 and "Blue" SKU "DMR-BLUE" price 389 stock 2
    And I click "Save"
    Then I am on /admin/products/<new id>
    And the preview card shows "DMR Vault" from "RM 389.00"

  @AD02_AC3
  Scenario: Photos survive a SKU rename
    Given variant "DMR-RED" has 2 photos
    When I change its SKU to "DMR-VAULT-RED" and save
    Then the variant still has the same 2 photos in the same order

  @AD02_AC3
  Scenario: Too big a photo
    When I drop a 7 MB photo on a variant
    Then I see "Photos must be 5 MB or smaller" and nothing is uploaded

  @AD02_AC4
  Scenario: Brand suggestion avoids a duplicate
    Given a brand "OneUp Components" exists
    When I type "oneup" in Brand
    Then "OneUp Components" is suggested
    And no "Create 'oneup'" option is shown

  @AD02_AC5
  Scenario Outline: Field errors
    When I set <field> to <value> and save
    Then I see <message> under <field>

    Examples:
      | field     | value                 | message                                         |
      | SKU       | an SKU used elsewhere | "SKU DMR-RED is already used by DMR Vault (Red)" |
      | Was price | 300 with price 389    | "Was price must be more than the price"          |
      | Name      | empty                 | "Name is required"                               |

  @AD02_AC6
  Scenario: Draft is hidden from shoppers
    Given product "DMR Vault" is Draft
    When a shopper opens the catalogue
    Then "DMR Vault" is not listed
    And /viewProduct/<id> shows the 404 page to the shopper
    And shows the product with a "Draft: not visible to shoppers" banner to an admin

  @AD02_AC7
  Scenario: Ordered products can only be archived
    Given variant "DMR-RED" appears on a past order
    When I open the product
    Then I see "Archive" and no "Delete"
    And DELETE /api/admin/products/<id> answers 409

  @AD02_AC8
  Scenario: Stale save
    Given another admin saved this product after I opened it
    When I click "Save"
    Then I see "Someone else saved this product since you opened it. Reload to see their changes."
    And my edits stay in the form
```

## AD-03: Manage the catalogue in bulk

**User Story:** As the shop owner, I want to find, fix and change many products quickly, so that keeping the catalogue tidy isn't a chore.

### Acceptance criteria

**AD03-AC1: Find fast.** Search matches name, brand or SKU. Filter chips: All, Live, Draft, Archived, Low stock, Out of stock. Filters live in the URL.
**AD03-AC2: Quick edits.** Price edits inline in the list. Stock opens the Adjust popover (AD-04).
**AD03-AC3: Bulk actions.** Selected products can be set to a status, moved to a category or brand, or deleted (only those never ordered; the rest are reported back).
**AD03-AC4: CSV export.** Export gives one row per variant with the documented columns.
**AD03-AC5: CSV import with a dry run.** Import shows what would be created, updated or rejected per line before anything changes. Applying it does exactly that. New products arrive as Draft.
**AD03-AC6: Rename or merge.** Renaming a category or brand to an existing name merges them. Every product moves, and the brand logo is kept.

### Gherkin specifications

```gherkin
@AD03
Feature: Catalogue in bulk

  Background:
    Given I am an admin on /admin/products

  @AD03_AC1
  Scenario: Search by SKU
    When I search "DMR-RED"
    Then only "DMR Vault" is listed
    And the URL contains "q=DMR-RED"

  @AD03_AC3
  Scenario: Bulk delete skips ordered products
    Given I select 3 products, 1 of which has been ordered
    When I choose "Delete" and confirm
    Then 2 products are deleted
    And I see "1 product has orders, so it was archived instead of deleted"

  @AD03_AC5
  Scenario: Import dry run
    Given a CSV with 1 row updating DMR-RED's price, 1 new SKU for product 25, and 1 row with price "abc"
    When I upload it
    Then I see 1 update, 1 new variant and 1 error "Line 4: price must be a number"
    And nothing has changed yet
    When I click "Import 2 rows"
    Then DMR-RED has the new price and product 25 has the new variant

  @AD03_AC6
  Scenario: Merge duplicate brands
    Given brands "Oneup" (2 products) and "OneUp Components" (5 products)
    When I rename "Oneup" to "OneUp Components"
    Then "OneUp Components" has 7 products and "Oneup" no longer exists
```

## AD-04: Stock you can trust

**User Story:** As the shop owner, I want the stock number to always be right and to know why it changed, so that I never sell a part I don't have.

### Acceptance criteria

**AD04-AC1: Held at checkout.** Starting checkout takes the quantities off available stock straight away. If any line is short, the whole checkout is refused and nothing is held.
**AD04-AC2: Released when abandoned.** An unpaid checkout releases its hold when Stripe expires it, when the customer cancels, or after 35 minutes at the latest.
**AD04-AC3: Paid keeps the hold.** Paying never deducts stock a second time, whether confirmed by the success page, the webhook, or both.
**AD04-AC4: Adjust with a reason.** Admins set a new stock level with a reason (Received delivery, Damaged or lost, Count correction) and an optional note. If stock changed since they looked, they're told and nothing is saved.
**AD04-AC5: History.** Every change to stock is recorded with change, stock after, reason, order (if any), who and when. History shows per variant, and in a shop-wide log with CSV export.
**AD04-AC6: Low stock threshold.** Each product has a low-stock threshold (default 3). It drives the storefront "Only N left" message, the admin filters and the dashboard card.
**AD04-AC7: Never negative.** Stock can never go below 0, even with simultaneous checkouts.

### Gherkin specifications

```gherkin
@AD04
Feature: Stock

  Background:
    Given variant "DMR-RED" has stock 1

  @AD04_AC1 @AD04_AC7
  Scenario: Two shoppers, one unit
    Given shoppers A and B each have 1 "DMR-RED" in their cart
    When both start checkout at the same moment
    Then exactly one checkout reaches Stripe
    And the other sees "Only 0 of DMR Vault (Red) left. We've updated your cart."
    And "DMR-RED" has stock 0

  @AD04_AC2
  Scenario: Abandoned checkout comes back
    Given a shopper started checkout for 1 "DMR-RED" and never paid
    When 35 minutes pass
    Then "DMR-RED" has stock 1
    And its history shows "Hold released" for that order

  @AD04_AC3
  Scenario: Success page and webhook both arrive
    Given a shopper paid for 1 "DMR-RED"
    When the webhook and the success page both confirm the payment
    Then the order is Paid once
    And "DMR-RED" has stock 0

  @AD04_AC4
  Scenario: Adjust after a delivery
    Given I am an admin
    When I adjust "DMR-RED" to 6 with reason "Received delivery" and note "PO 1182"
    Then "DMR-RED" has stock 6
    And its history shows +5, stock after 6, "Received delivery", "PO 1182", my name

  @AD04_AC4
  Scenario: Stock moved while I was looking
    Given I opened the Adjust popover when stock was 1
    And a shopper then started checkout for 1
    When I set stock to 6
    Then I see "Stock changed to 0 since you opened this. Check and try again."
    And stock stays 0

  @AD04_AC6
  Scenario Outline: Storefront stock message
    Given the product's low-stock threshold is 2
    When "DMR-RED" has stock <stock>
    Then the product page shows <message>

    Examples:
      | stock | message         |
      | 5     | "In stock"      |
      | 2     | "Only 2 left"   |
      | 0     | "Out of stock"  |
```

## AD-05: Run orders end to end

**User Story:** As the shop owner, I want to ship, cancel and refund orders from the admin, so that I don't have to jump between the admin, Stripe and WhatsApp.

### Acceptance criteria

**AD05-AC1: Find orders.** The orders list filters by status, payment state, date range and search (order #, name, email, phone, SKU), all in the URL.
**AD05-AC2: Allowed moves only.** Paid → Shipped → Completed, Completed → Shipped, and Cancel from Pending, Paid or Shipped. Only those actions are shown, and the API refuses any other move with a 409.
**AD05-AC3: Ship with tracking.** "Mark shipped" takes an optional courier and tracking number, and the customer is emailed.
**AD05-AC4: Refund through Stripe.** "Refund" takes an amount (up to paid minus already refunded) and a required reason, and refunds the card through Stripe. A retry never refunds twice.
**AD05-AC5: Pending refunds.** If Stripe hasn't confirmed yet, the order shows a pending banner, and new refunds and cancels are paused until it resolves.
**AD05-AC6: Cancel.** "Cancel order" needs a reason, offers a refund prefilled with the remaining paid amount, and offers "Put items back in stock" (on by default). The customer is emailed.
**AD05-AC7: Notes and timeline.** Staff-only notes can be added. The timeline lists every status change, refund, note and email, with who and when.
**AD05-AC8: Payment confirmed even if the tab closes.** With the webhook configured, a paid order becomes Paid even if the shopper never reaches the success page.
**AD05-AC9: Email failures don't block.** If an email fails, the action still happens and the timeline shows "Email failed".

### Gherkin specifications

```gherkin
@AD05
Feature: Orders

  Background:
    Given I am an admin
    And order #123 is Paid for RM 778.00 with 2 items

  @AD05_AC2
  Scenario: Only valid actions
    When I open order #123
    Then I see "Mark shipped", "Refund" and "Cancel order"
    And I don't see "Mark completed" or "Reopen"
    And POST /api/admin/orders/123/complete answers 409

  @AD05_AC3
  Scenario: Ship with tracking
    When I mark #123 shipped with courier "J&T" and tracking "JT123456"
    Then #123 is Shipped
    And the customer gets the "Order shipped" email containing "JT123456"
    And the timeline shows "Shipped" by me

  @AD05_AC4
  Scenario: Partial refund
    When I refund RM 100.00 with reason "Goodwill: scratched box"
    Then Stripe is asked to refund RM 100.00 on the order's payment
    And I see "Refunded RM 100.00"
    And the payment badge shows "Partly refunded"

  @AD05_AC4
  Scenario: Can't over-refund
    Given RM 700.00 has already been refunded
    When I enter RM 100.00
    Then I see "Can't refund more than RM 78.00" and the button is disabled

  @AD05_AC5
  Scenario: Refund pending
    Given Stripe accepted a refund but hasn't confirmed it
    When I open order #123
    Then I see "Refund of RM 100.00 requested; waiting for Stripe to confirm."
    And "Refund" and "Cancel order" are disabled

  @AD05_AC6
  Scenario: Cancel and refund in full
    When I cancel #123 with reason "Customer asked to cancel", refund RM 778.00 and "Put items back in stock" ticked
    Then #123 is Cancelled and Refunded
    And both items' stock goes back up with reason "Cancel restock"
    And the customer gets the "Order cancelled" email mentioning RM 778.00

  @AD05_AC8
  Scenario: Shopper closes the tab after paying
    Given a shopper paid in Stripe and closed the tab
    When Stripe sends checkout.session.completed
    Then the order is Paid and the shopper's cart is cleared

  @AD05_AC9
  Scenario: Email server down
    Given email sending fails
    When I mark #123 shipped
    Then #123 is Shipped
    And the timeline shows "Email failed: Order shipped"
```

## AD-06: Edit every page's content

**User Story:** As the shop owner, I want to change any words, photos or sections on the site myself, so that I don't need a developer to update the shop.

### Acceptance criteria

**AD06-AC1: Every section editable.** Home (hero, brand wall, fresh in, categories, promise strip, numbers, visit), About, Header & footer, 404 and the sign-in pages each have their text, images, links and a "Show this section" toggle.
**AD06-AC2: Preview before saving.** Each section shows a live preview rendered by the real storefront component with the unsaved values.
**AD06-AC3: Live on save.** After saving, a fresh storefront load shows the change with no redeploy.
**AD06-AC4: Defaults match today.** On a fresh database every page looks and reads exactly as before this change.
**AD06-AC5: Validated.** Over-long text, empty required fields and bad URLs are refused with field errors, and the storefront keeps the last good value.

### Gherkin specifications

```gherkin
@AD06
Feature: Site content

  Background:
    Given I am an admin on /admin/content/home

  @AD06_AC2 @AD06_AC3
  Scenario: Change the hero headline
    When I change the hero headline to "Built for" / "Kiara mud."
    Then the preview shows "Kiara mud."
    When I save and a shopper opens the home page
    Then the hero reads "Built for Kiara mud."

  @AD06_AC1
  Scenario: Hide a section
    When I turn off "Show this section" on the promise strip and save
    Then the home page has no promise strip

  @AD06_AC4
  Scenario: Fresh install looks the same
    Given an empty site_settings table
    When a shopper opens the home, about and 404 pages
    Then every text matches the text before this change

  @AD06_AC5
  Scenario: Bad link
    When I set the hero button link to "javascript:alert(1)"
    Then I see "Link must start with / or https://" and the save is refused
```

## AD-07: Shop settings, theme and emails

**User Story:** As the shop owner, I want to update my contact details, hours, look and emails in one place, so that the whole site stays correct when something changes.

### Acceptance criteria

**AD07-AC1: Shop details everywhere.** Phone, WhatsApp, address, maps link, map embed, socials, coordinates and founded year update the header, footer, home, About and the numbers section.
**AD07-AC2: Hours drive the open badge.** Opening times per weekday, closed days and dated closures (with a reason) drive "Open now", "Closed now" and "Closed today: <reason>" in Malaysia time.
**AD07-AC3: SEO and chatbot.** Page titles, meta description, chatbot URL and the floating chat button toggle are editable.
**AD07-AC4: Theme with a readability check.** Accent, accent-ink and hot colours per mode, with a live swatch. The save is refused below a 4.5 contrast ratio for text on accent or accent text on the page.
**AD07-AC5: Email wording.** Password reset, order shipped, cancelled and refunded emails have editable subject and body with `{{name}}`, `{{link}}`, `{{orderId}}`, `{{shopName}}` placeholders. Unknown placeholders are refused.

### Gherkin specifications

```gherkin
@AD07
Feature: Shop settings

  Background:
    Given I am an admin

  @AD07_AC1
  Scenario: New phone number
    When I change the phone to "+6012-345 6789" and save
    Then the footer, the home visit section and the About contact card show "+6012-345 6789"
    And the WhatsApp links point at the new number

  @AD07_AC2
  Scenario: Holiday closure
    Given 2026-12-25 is a closed date with reason "Christmas ride"
    When a shopper opens the home page on 2026-12-25 at 14:00 Malaysia time
    Then the badge reads "Closed today: Christmas ride"

  @AD07_AC4
  Scenario: Unreadable accent
    When I set the dark-mode accent to "#1a1d17"
    Then I see the contrast score and "Text on this colour is hard to read (1.2:1, needs 4.5:1)"
    And the save is refused

  @AD07_AC5
  Scenario: Shipped email wording
    When I set the shipped email body to "Hi {{name}}, order {{orderId}} is on its way"
    And an order for "Aiman" is marked shipped
    Then Aiman's email reads "Hi Aiman, order 123 is on its way"
```

## AD-08: See and manage the shop

**User Story:** As the shop owner, I want a home screen that tells me what needs doing and tools for customers, banners and brands, so that I can run the shop from one place.

### Acceptance criteria

**AD08-AC1: Dashboard.** Shows orders to ship, low-stock variants, pending refunds, sales for the last 7 and 30 days, recent orders, and "Fix duplicate SKUs" when duplicates exist. Each item links to the matching screen.
**AD08-AC2: Customers.** List with search, each customer's details and orders, change role, deactivate or reactivate. An admin can't demote or deactivate themselves or the last active admin.
**AD08-AC3: Deactivated can't sign in.** A deactivated account gets the same message as a wrong password.
**AD08-AC4: Banners and brands.** Banners: upload, alt text, optional link, active toggle, drag to reorder. Brands: logo, visibility, drag to reorder. The storefront follows the order and visibility.
**AD08-AC5: Activity log.** Every admin change is logged with who, what and when, newest first.

### Gherkin specifications

```gherkin
@AD08
Feature: Run the shop

  Background:
    Given I am an admin

  @AD08_AC1
  Scenario: Dashboard shows what needs doing
    Given 3 Paid orders and 2 variants at or under their threshold
    When I open /admin
    Then I see "3 orders to ship" and "2 low on stock"
    And clicking "3 orders to ship" opens /admin/orders?status=Paid

  @AD08_AC2
  Scenario: Can't remove the last admin
    Given I am the only active admin
    When I try to change my own role to Customer
    Then I see "You can't remove your own admin access"

  @AD08_AC3
  Scenario: Deactivated customer
    Given I deactivated "aiman"
    When aiman signs in with the right password
    Then he sees "Wrong username or password"

  @AD08_AC4
  Scenario: Reorder banners
    When I drag banner 3 to the top and save
    Then the home hero starts with banner 3

  @AD08_AC5
  Scenario: Activity is logged
    When I archive "DMR Vault"
    Then /admin/activity shows me, "Archived product DMR Vault" and the time
```

## AD-09: Nothing gets lost

**User Story:** As the shop owner, I want upgrades and product changes to never damage my orders or photos, so that my records stay complete.

### Acceptance criteria

**AD09-AC1: Migrations run themselves.** On start-up, pending migrations run in order before the API serves requests. Running them twice changes nothing.
**AD09-AC2: Data kept.** After migrating the seeded database every product, variant, photo, banner, brand, order and account is still there, and photos are in the new layout. Any photo that couldn't be matched is logged and left in place.
**AD09-AC3: Order history survives.** Order lines keep product name, variant name, SKU and unit price, so editing, archiving or deleting a product never changes an existing order.
**AD09-AC4: Old orders backfilled.** The migration fills the snapshot for existing order lines from their current product data.

### Gherkin specifications

```gherkin
@AD09
Feature: Data safety

  @AD09_AC1
  Scenario: Migrations are idempotent
    Given a database already migrated to the latest version
    When the API restarts
    Then no migration runs and the schema is unchanged

  @AD09_AC2
  Scenario: Seeded data survives
    Given the seeded database and bundled images
    When the migrations run
    Then counts of products, variations, banners, brands, orders, order items and accounts are unchanged
    And every variant that had photos still has them

  @AD09_AC3
  Scenario: Renamed product, old order
    Given order #123 contains "DMR Vault (Red)" at RM 389.00
    When I rename the product to "DMR Vault 2" and change the price to RM 420.00
    Then order #123 still shows "DMR Vault (Red)" at RM 389.00
```

## Shared technical completion checks

These are part of done, not later hardening.

- Backend (`npx vitest run`) and frontend (`npm test`) tests pass, including new tests for: settings validation, migrations (fresh and already migrated), stock holds under concurrency, hold expiry, refund idempotency, webhook deduplication, order transitions, CSV import dry run, and taxonomy merge.
- `npm run lint` passes with zero warnings. `npm run build` succeeds with no `@mui` or `@emotion` in the output.
- `docker compose up -d --build --wait` works on a fresh machine, and the storefront matches today's look with an empty settings table.
- Every `/api/admin/*` route has a test proving 401 when signed out and 403 for a customer.
- Uploaded files are checked by content type and size, and stored under generated names (no user-supplied paths).
- README updated: new admin areas, `STRIPE_WEBHOOK_SECRET`, how migrations run.

## Project note: safe test environments

Use Stripe test keys (`sk_test_...`) and the Stripe CLI (`stripe listen --forward-to localhost:8080/api/stripe/webhook`) for refund and webhook testing. Never point a local stack at live keys.
