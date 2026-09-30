# Code notes

Why the code is the way it is, grouped by area. Rules live in `CLAUDE.md`; this
file holds the reasoning that would otherwise end up in comments. Update a note
in the same PR as the behaviour it describes.

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
- Money is `numeric(12,2)` in postgres and a decimal string everywhere else
  (sqlc override to `string`, JSON `"600.00"`). Totals are summed in SQL, so no
  float ever touches a price.

## Backend: auth

- Sessions are an opaque random token in an HttpOnly, SameSite=Lax cookie;
  only its SHA-256 is stored. A stolen database does not yield usable
  sessions, and logout is a row delete, which a JWT cannot offer.
- `auth.Login` runs bcrypt against a dummy hash when the email is unknown, so
  response time does not reveal which emails have accounts.
- Failed sign-ins are counted per email in memory: 5 within 15 minutes locks
  that email until the window passes, even for the right password. It resets
  on restart and is not shared between api instances, and someone who knows an
  email can lock it out for 15 minutes. Good enough for one shop on one
  instance; move it to postgres or redis before running more than one.
- Disabling a member or resetting their password deletes their sessions in the
  same transaction, so the change takes effect on their next request.
- Services read the user from `actor.From(ctx)`. The middleware in `httpx` sets
  it, which keeps gin out of services.

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

- The vite dev proxy reads `HTTP_PORT` from the repo root `.env`, so moving
  the api off a busy port is one edit. `VITE_API_PROXY_TARGET` still wins when
  the api runs somewhere else entirely.
- Product tiles show the first letter of the name on a colour picked from the
  SKU. A fixed icon set cannot cover every kind of product a shop sells; photo
  upload can replace the tile later. Thai leading vowels (เ แ โ ใ ไ) are skipped
  so the tile shows a consonant.
- The unit strip draws one cell per unit up to 24 (list) or 40 (panel) and
  becomes a proportional bar beyond that, where individual cells stop being
  readable.
- A 401 from any query clears the cache and sends the user to `/login` with a
  redirect back, so an expired session never leaves stale data on screen.
- The new-order page keeps the server's shortage list after a 409 and marks
  each short line with what is left, because the counter staff did nothing
  wrong: another channel sold the stock first.
