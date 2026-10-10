# Code notes

Why the code is the way it is, grouped by area. Rules live in `CLAUDE.md`; this
file holds the reasoning that would otherwise end up in comments. Update a note
in the same PR as the behaviour it describes.

## Backend: startup and shutdown

- `run()` returns an error instead of exiting so that every `defer` in it runs.
  `os.Exit` in `main` would skip them.
- `database.NewPool` pings before returning, so a wrong `DATABASE_URL` fails at
  startup instead of on the first request.
- Shutdown uses a fresh `context.Background()` with its own timeout. The signal
  context is already canceled by then and would abort the drain immediately.

## Backend: http

- `httpx.NewRouter` returns `http.Handler`, not `*gin.Engine`, so `cmd/api`
  never imports gin.
- `Recovery` replaces `gin.Recovery` so a panic produces the same JSON envelope
  and log format as every other error. A broken pipe is logged at warn and not
  answered, since the client is gone.
- `RequestLogger` picks the log level from the response status (5xx error, 4xx
  warn), so failures can be filtered by level.
- The request id is echoed in `X-Request-ID` and in every error body, so a
  failed request can be traced from the client to the log line.
- Error `code` values are the contract clients branch on; `message` is for
  humans and may change.

## Backend: health

- `/healthz` answers 503 when the database is unreachable, so a load balancer
  takes the instance out of rotation instead of sending it traffic.
- The database ping is capped at 2s so a hung database cannot hold the
  endpoint open past a load balancer's own timeout.

## Backend: stock and orders

- Every write that decides on stock first locks the `stock_balances` rows it
  touches with `SELECT ... FOR UPDATE`, always in product id order
  (`stock.Lock`). A fixed order means two orders for the same products queue
  instead of deadlocking.
- The decision (`orders.PlanReservation`, `orders.PlanTransition`, the adjust
  check) is a plain function the repository calls after locking. That keeps the
  rule unit testable while the repository owns the transaction.
- `PlanReservation` reports every short line, not just the first, so the
  person at the counter fixes the cart in one go.
- The `stock_balances_available_non_negative` check still backs this up. If a
  future code path forgets the lock, `stock.Apply` turns the violation into
  `ErrInsufficientStock` instead of a 500.
- An adjustment may only remove available units. Removing held units would
  leave an order promising stock that is gone.
- Each movement stores `on_hand_after` and `reserved_after`, written under the
  same lock, so the ledger can show running balances without replaying
  history.
- A rejected order is written to the audit log after its transaction rolls
  back, because the rollback would otherwise erase the record of the attempt.
- A mistyped stock-in or adjustment is undone by an opposite ADJUST that
  points at it (`reverses_id`), never by deleting or editing the row, so the
  ledger still shows what happened. A unique index on `reverses_id` stops the
  same row being undone twice under concurrency. Order movements are excluded:
  cancelling the order is the undo for those.
- A stock count stores, per line, what was counted and the `on_hand` at the
  moment it was saved (`expected`). Approval applies `counted - expected`, not
  `counted - on_hand now`: sales shipped between counting and approval already
  left the shelf and the ledger, so using today's number would count them
  twice. Staff can count but only an owner approves, because approval rewrites
  balances. Count adjustments carry `ref_type = stock_count` and are not
  undoable one by one; a wrong count is fixed by counting again.
- Approval is all or nothing, like an order: if one line would take units that
  orders hold, nothing is adjusted and every such line is reported. The usual
  cause is packed parcels that were not counted.
- A delivery with many products is one `stock_receipts` row plus one
  STOCK_IN per line, written in one transaction so a bad line leaves nothing
  half received. The receipt keeps the supplier's note number so the ledger
  can show where stock came from. Unlike order and count movements, a receipt
  line can still be undone on its own: a typo on one line should not force
  undoing the whole delivery.
- A counter sale where the customer leaves with the goods (`handed_over`)
  still goes through RESERVE then SHIP inside one transaction, rather than a
  bare stock-out. It takes the same lock and oversell check as every other
  order, and the ledger reads the same way for every channel. Only the store
  channel may do this; online orders always wait to be packed.
- Orders keyed in by hand must carry what staff need to find them again: a
  Shopee order needs its Shopee number (so the unique index can catch the
  same order keyed twice), a LINE order needs the customer's name, and a store
  order picked up later needs a name or phone. These live in Go only: a
  handed-over sale is inserted as `reserved` before it ships, so a row check
  cannot tell it from a pickup, and older rows were saved without them.
- Money is `numeric(12,2)` in postgres and a decimal string everywhere else
  (sqlc override to `string`, JSON `"600.00"`). Totals are summed in SQL, so no
  float ever touches a price.

## Backend: auth

- Sessions are an opaque random token in an HttpOnly, SameSite=Lax cookie;
  only its SHA-256 is stored. A stolen database does not yield usable
  sessions, and logout is a row delete, which a JWT cannot offer.
- `auth.Login` runs bcrypt against a dummy hash when the email is unknown, so
  response time does not reveal which emails have accounts.
- Disabling a member or resetting their password deletes their sessions in the
  same transaction, so the change takes effect on their next request.
- Services read the user from `actor.From(ctx)`. The middleware in `httpx` sets
  it, which keeps gin out of services.

- The login page lists demo sign-ins only when `DEMO_ACCOUNTS` is set, which
  only the public demo does. The endpoint is public by design and returns
  passwords, so it must stay driven by config, never by a build flag or a
  hostname check that a real deployment could trip.

## Backend: LINE orders

- A LINE order is an ordinary order on the `line` channel. It goes through
  `orders.Service.Create`, so it takes the same row locks and all-or-nothing
  check as a counter sale; the integration test races the two for the last
  unit.
- The customer is identified by the LIFF ID token, which the api checks with
  LINE's verify endpoint against our LINE Login channel id. The browser never
  sends a user id the api trusts on its own. The Login channel and the
  Messaging API channel must sit under the same LINE provider, otherwise the
  user id from the token is not one the Official Account can message.
- Status messages go through `orders.Notifier`, called after the transaction
  commits. A failed push is logged and dropped: the stock change already
  happened and must not be rolled back because LINE was slow. There is no
  retry queue; the shop can still message the customer in the chat.
- `LINE_MODE=dev` swaps in `DevVerifier`, which accepts `dev:<name>`, and a
  messenger that only logs. It exists so the order form can be demonstrated
  without a LINE account, and config refuses it in production because anyone
  could sign in as anyone.
- The public catalog shows a count only when stock is low ("2 left"), so the
  shop's exact stock levels are not published to every customer.
- The order endpoint is public apart from the ID token. Anyone with a LINE
  account could reserve stock without paying; the shop cancels such orders by
  hand. Add per-user limits if that becomes a problem.

## Backend: tests

- Integration tests use `TEST_DATABASE_URL`, not `DATABASE_URL`, because they
  leave rows behind and would clutter the dev database the UI reads.

## Deployment

- The api serves the built frontend when `STATIC_DIR` is set, so the shop is
  one process and one origin: no CORS, and the session cookie needs no
  cross-site settings. Unknown paths fall back to `index.html` for client
  routes, but `/api/*` and non-GET requests still get the JSON 404.
- Hashed files under `/assets/` are cached for a year; `index.html` is
  `no-cache` so a new deploy is picked up on the next load.
- The compose `app` profile defaults `COOKIE_SECURE` to false because a shop
  often reaches the app over plain http on its own network, where a Secure
  cookie would never be sent back and sign-in would silently fail.
- Migrations run from the `migrate/migrate` image before the app starts,
  instead of inside the api, so a failed migration stops the deploy rather
  than leaving the api half up.

## Frontend

- The vite dev server proxies `/api` and `/healthz` to the Go api, so requests
  are same-origin in development and the api needs no CORS setup. The target
  port comes from `HTTP_PORT` in the repo root `.env`, so moving the api off a
  busy port is one edit; `VITE_API_PROXY_TARGET` wins when the api runs
  somewhere else entirely.
- `apiFetch` takes `acceptStatuses` for non-2xx responses whose body is still
  data. `/healthz` answering 503 is a health report, not a failure.
- ESLint allows numbers in template strings; the strict default only forces
  `String(status)` noise.
- Route files and shadcn/ui components have `react-refresh/only-export-components`
  off: the router's autoCodeSplitting moves route components into their own
  module, and shadcn exports cva variant helpers by design.
- Products have no tile or placeholder image. A letter tile on one tone told
  nothing the name did not, and read as filler; photo upload can add a real
  image later. `productInitial` still draws people's avatars, and skips Thai
  leading vowels (เ แ โ ใ ไ) so it shows a consonant.
- Navigation is one list in `src/lib/nav.ts`, rendered by `AppNav` in both the
  sidebar and the phone drawer. The current item is found by
  `activeNavPath`, the longest whole-segment match. TanStack's own active
  matching is fuzzy by prefix, so it would mark ออเดอร์ on `/orders/new` too;
  the links pass `activeOptions={{ exact: true }}` and set `aria-current`
  from `activeNavPath` instead.
- Split layouts (stock list and panel, order entry and cart, receive and its
  form, Today's grid, order detail) switch on the width of `main` through
  container queries (`@4xl`, `@5xl`), not on the window. With a 208px sidebar
  the window breakpoints put the stock list beside its 480px panel at a
  content width where product names no longer fit.
- The stock list moves the unit strip under the product name below the `sm`
  breakpoint. A fixed 200px strip column left no room for the name on a phone.
- Today shows how long each queued order has waited instead of its timestamp
  (kept in the hover title). It turns amber after 24 hours and red after 72,
  either side of the marketplaces' ship-within-two-days rule. The queues ask the
  orders list for `sort=oldest`, so the five shown are the ones waiting longest;
  newest first would hide exactly the orders most at risk.
- The orders list carries each order's customer name and lines (product name
  and quantity) so Today can show what to pick without opening the order. The
  lines for a page come from one `ListItemsForOrders` query keyed by the page's
  order ids, not one query per order.
- Today's sales (`GET /api/sales/today`, owner only) count orders placed today
  that are not canceled, with their totals, plus orders shipped today whenever
  they were placed. "Today" is the calendar day in `SHOP_TIMEZONE`, computed in
  Go and passed to SQL as a half-open range, so the database session's time
  zone never matters. `time/tzdata` is embedded so the zone loads on any host.
- The sales integration test writes its orders inside one transaction that it
  rolls back. Every row shares that transaction's `now()`, so a one-microsecond
  day holds only its own orders while other packages write to the same database.
- The unit strip draws one cell per unit up to 24 (list) or 40 (panel) and
  becomes a proportional bar beyond that, where individual cells stop being
  readable.
- A 401 from any query clears the cache and sends the user to `/login` with a
  redirect back, so an expired session never leaves stale data on screen.
- The new-order page keeps the server's shortage list after a 409 and marks
  each short line with what is left, because the counter staff did nothing
  wrong: another channel sold the stock first.
- Staff key orders in from two pages, a store sale (`/orders/new`) and an
  online order (`/orders/online`), sharing one form. Each page asks only for
  what its case needs, and the online page has no default channel, so a
  Shopee order cannot slip in as a store sale by a missed click. The Shopee
  number is checked against the order search when the field loses focus, so a
  duplicate is caught before the cart is filled; the unique index still has
  the final word.

## Tooling

- `.gitattributes` forces LF because `core.autocrlf=true` on Windows checks
  files out with CRLF, and gofmt and prettier then flag every file.
- The Go toolchain pin is explained under "Version pins" in `CLAUDE.md`.
