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
- Money is `numeric(12,2)` in postgres and a decimal string everywhere else
  (sqlc override to `string`, JSON `"600.00"`). Totals are summed in SQL, so no
  float ever touches a price.

## Backend: auth

- Sessions are an opaque random token in an HttpOnly, SameSite=Lax cookie;
  only its SHA-256 is stored. A stolen database does not yield usable
  sessions, and logout is a row delete, which a JWT cannot offer.
- `auth.Login` runs bcrypt against a dummy hash when the email is unknown, so
  response time does not reveal which emails have accounts.
- Services read the user from `actor.From(ctx)`. The middleware in `httpx` sets
  it, which keeps gin out of services.

## Backend: tests

- Integration tests use `TEST_DATABASE_URL`, not `DATABASE_URL`, because they
  leave rows behind and would clutter the dev database the UI reads.

## Frontend

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
