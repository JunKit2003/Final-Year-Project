# Containers, upgrade and storefront revamp: acceptance specification

**Product:** Faction Bikeworks web store
**Parent:** none (no work item)
**Date:** 2026-11-20
**Status:** Built, awaiting first deploy

Design doc: [plans/2026-11-20-containers-revamp-design.md](plans/2026-11-20-containers-revamp-design.md)

Story labels (e.g. `FB-01`) are provisional, not work item IDs. The Gherkin describes expected behaviour, not passing tests.

## Stories at a glance

- **FB-01 One-command stack:** the whole shop runs from `docker compose up`.
- **FB-02 Shop the parts:** browsing, filtering and product pages work on the new design.
- **FB-03 Cart and checkout:** shoppers can buy through Stripe, and a misconfigured server fails politely.
- **FB-04 Accounts and orders:** sign up, sign in, reset password and follow orders.
- **FB-05 Ship on merge:** CI checks every change; `main` deploys and rolls back on failure.
- **FB-06 Locked down:** only admins change the shop, and customers only see their own cart and orders.

## Shared definitions and boundaries

- **Stack:** the `db`, `backend` and `frontend` services in `docker-compose.yml`.
- **Site origin:** the URL the frontend container is served on (`PUBLIC_URL`).

### Out of scope for all stories

Admin feature changes, data migration from the live site, payment provider changes.

## FB-01: One-command stack

**User Story:** As the developer, I want the whole shop to start with one command, so that any machine or server runs the same thing.

### Acceptance criteria

**FB01-AC1: Starts healthy.** With a filled-in `.env`, `docker compose up -d --wait` brings all three services to healthy.
**FB01-AC2: Waits for the database.** The API starts only once MySQL accepts logins.
**FB01-AC3: Data survives rebuilds.** Database rows and uploaded images persist across `up --build`.
**FB01-AC4: Secrets required.** The stack refuses to start without `DB_PASSWORD`, `DB_ROOT_PASSWORD` and `SESSION_SECRET`.
**FB01-AC5: API not exposed.** Only the frontend publishes a port.

### Gherkin specifications

```gherkin
@FB01
Feature: One-command stack

  @FB01_AC1 @FB01_AC2
  Scenario: Fresh start
    Given a machine with Docker and a filled-in .env
    When I run docker compose up -d --wait
    Then db, backend and frontend report healthy
    And GET /api/health through the site returns {"status":"ok"}

  @FB01_AC3
  Scenario: Rebuild keeps data
    Given products and an uploaded image exist
    When I run docker compose up -d --build
    Then the products and the image are still there

  @FB01_AC4
  Scenario: Missing secret
    Given SESSION_SECRET is not set
    When I run docker compose up
    Then compose stops with "set SESSION_SECRET in .env"

  @FB01_AC5
  Scenario: Backend port
    When I list published ports
    Then only the frontend has one
```

## FB-02: Shop the parts

**User Story:** As a rider, I want to find the right part quickly, so that I can get back on the trail.

### Acceptance criteria

**FB02-AC1: Filters in the URL.** Search, category, brand, price, in-stock and sort are reflected in the URL and survive a refresh.
**FB02-AC2: Old brand links.** `/catalog/<brand>` shows that brand, matching case-insensitively.
**FB02-AC3: Product options.** Choosing an option updates price, stock, photos and the add-to-cart total.
**FB02-AC4: Stock honesty.** Out-of-stock options can't be added; quantity can't exceed stock.
**FB02-AC5: Themes.** Dark and light themes both work and the choice is remembered.

### Gherkin specifications

```gherkin
@FB02
Feature: Shop the parts

  @FB02_AC1
  Scenario: Shareable filtered view
    When I search "deity" and pick category "Stems"
    Then the URL contains q=deity and category=Stems
    And refreshing shows the same results

  @FB02_AC2
  Scenario: Brand link from the home page
    When I open /catalog/Deity
    Then only Deity products are listed

  @FB02_AC3 @FB02_AC4
  Scenario Outline: Picking an option
    Given a product option with stock <stock>
    When I select it
    Then the add to cart button is <state>

    Examples:
      | stock | state                    |
      | 0     | disabled, "Out of stock" |
      | 3     | enabled, max quantity 3  |

  @FB02_AC5
  Scenario: Theme remembered
    When I switch to light mode and reload
    Then the site is still in light mode
```

## FB-03: Cart and checkout

**User Story:** As a shopper, I want to pay for the parts I picked, so that they get shipped to me.

### Acceptance criteria

**FB03-AC1: Cart follows the account.** Signed-in shoppers see their saved cart; signed-out shoppers are asked to sign in.
**FB03-AC2: Only buyable lines.** Lines over stock are flagged and can't be selected.
**FB03-AC3: Stripe hosted checkout.** Paying sends the shopper to Stripe's page and back to `/paymentSuccess` or `/paymentFailed` on the site origin.
**FB03-AC4: Confirm or cancel.** Success marks the order Paid and clears those lines; cancel removes the pending order.
**FB03-AC5: Payments off.** Without a Stripe key the API still runs and checkout shows a friendly message, creating no order.

### Gherkin specifications

```gherkin
@FB03
Feature: Cart and checkout

  @FB03_AC1
  Scenario: Signed out
    Given I am not signed in
    When I open /cart
    Then I am asked to sign in

  @FB03_AC2
  Scenario: Line over stock
    Given my cart has 3 of an option with 2 in stock
    Then that line shows "Only 2 available" and can't be selected

  @FB03_AC3 @FB03_AC4
  Scenario: Pay
    Given STRIPE_SECRET_KEY is set
    When I fill in delivery details and press Pay
    Then I land on Stripe's checkout page
    When I complete payment
    Then I return to <PUBLIC_URL>/paymentSuccess
    And the order shows as Paid in My orders

  @FB03_AC5
  Scenario: Payments not configured
    Given STRIPE_SECRET_KEY is empty
    When I press Pay
    Then I see "Online payments are unavailable right now"
    And no order is created
```

## FB-04: Accounts and orders

**User Story:** As a customer, I want an account, so that my cart and orders are kept.

### Acceptance criteria

**FB04-AC1: Sign up and in.** New accounts are always Customer; signing in returns to the page the shopper came from.
**FB04-AC2: Password reset.** Email, code, new password; then sign in.
**FB04-AC3: Order history.** Orders list with status, and a detail page with a progress timeline.
**FB04-AC4: Privacy.** A customer can't open another customer's order.
**FB04-AC5: Admin.** Admins reach the admin dashboard from the account menu.

### Gherkin specifications

```gherkin
@FB04
Feature: Accounts and orders

  @FB04_AC1
  Scenario: Sign in from a product
    Given I am on a product page signed out
    When I press Add to cart and sign in
    Then I am back on that product page

  @FB04_AC3
  Scenario: Order timeline
    Given an order with status Shipped
    When I open it
    Then Pending, Paid and Shipped are ticked and Completed is not

  @FB04_AC4
  Scenario: Someone else's order
    When I open /customerViewOrderList/<other user id>/<their order id>
    Then I see "You don't have permission to view this order."
```

## FB-05: Ship on merge

**User Story:** As the developer, I want every change checked and `main` deployed automatically, so that releases are safe and boring.

### Acceptance criteria

**FB05-AC1: CI on every PR.** Backend tests (with MySQL), frontend lint/test/build and both image builds run on PRs.
**FB05-AC2: Images on main.** Pushes to `main` publish both images to GHCR tagged with the commit SHA.
**FB05-AC3: Deploy gated.** Deploy runs only on `main` and only when `DEPLOY_ENABLED=true`.
**FB05-AC4: Automatic rollback.** If the new release isn't healthy within 3 minutes, the previous release is started again and the job fails.
**FB05-AC5: Pinned host.** SSH uses a pinned host key and a deploy-only key.

### Gherkin specifications

```gherkin
@FB05
Feature: Ship on merge

  @FB05_AC1
  Scenario: Broken test on a PR
    Given a PR where a backend test fails
    Then the CI/CD run fails and no image is pushed

  @FB05_AC2 @FB05_AC3
  Scenario: Merge to main
    Given DEPLOY_ENABLED is true and the VM is set up
    When a commit lands on main
    Then images :<sha> are pushed to GHCR
    And the VM runs :<sha> and .deployed-tag is <sha>

  @FB05_AC4
  Scenario: Bad release
    Given the new backend never becomes healthy
    When the deploy runs
    Then the previous tag is started again
    And the Deploy job fails
```

## FB-06: Locked down

**User Story:** As the shop owner, I want only admins to change the shop and each customer to see only their own data, so that nobody can tamper with products or read other people's orders.

### Acceptance criteria

**FB06-AC1: No self-made admins.** Public signup always creates a Customer, whatever the request says.
**FB06-AC2: Admin-only actions.** Adding, editing or deleting products, banners and brand images, listing all orders and fulfilling orders need an admin session (401 signed out, 403 for customers).
**FB06-AC3: Own data only.** Cart and order endpoints only act on the signed-in user; another user's id gets 403, another user's cart line gets 404.
**FB06-AC4: No default password.** A fresh install never has a known admin password.
**FB06-AC5: Session is ready on reply.** A request sent straight after sign-in is signed in, and the session id changes at sign-in.

### Gherkin specifications

```gherkin
@FB06
Feature: Locked down

  @FB06_AC1
  Scenario: Signup asking for admin
    When I POST /api/account/signup with category "Admin"
    Then the new account's category is "Customer"

  @FB06_AC2
  Scenario Outline: Admin-only route
    Given I am <who>
    When I call <route>
    Then the response is <status>

    Examples:
      | who        | route                          | status |
      | signed out | DELETE /api/product/delete/11  | 401    |
      | a customer | DELETE /api/product/delete/11  | 403    |
      | a customer | POST /api/cart/getOrders       | 403    |
      | an admin   | POST /api/cart/getOrders       | 200    |

  @FB06_AC3
  Scenario Outline: Someone else's data
    Given I am signed in as user 2
    When I call <route>
    Then the response is <status>

    Examples:
      | route                               | status |
      | GET /api/cart/3                     | 403    |
      | GET /api/cart/getUserOrders/3       | 403    |
      | POST /api/cart/add with user_id 3   | 403    |
      | DELETE /api/cart/<user 3's line id> | 404    |

  @FB06_AC4
  Scenario: Fresh install
    Given an empty database and no ADMIN_INITIAL_PASSWORD
    When the API starts
    Then "Admin" gets a random password printed once in the logs
    And signing in as Admin with "admin" fails

  @FB06_AC5
  Scenario: Straight after sign-in
    When I sign in and immediately GET my cart
    Then the response is 200
    And my session cookie differs from the one I had before signing in
```

## Shared technical completion checks

- Backend `npx vitest run` (111 tests) and frontend `npm test` (15 tests) pass; `npm run lint` passes with zero warnings.
- `actionlint` and `shellcheck` pass on the workflow and `deploy/deploy.sh`.
- No secret values in images, logs or the repo; `.env` is gitignored.
- `docker compose config` validates with `.env.example`.

## Project note: safe test environments

Use Stripe **test** keys (`sk_test_...`) and card `4242 4242 4242 4242` anywhere but production. Never point a local stack at the live database.
