# CLAUDE.md

Guidance for working in this repository. Read it before changing code.

## Purpose

shop-inventory-app is a multi-channel inventory back-office. One shop sells the
same stock through several channels (store, Shopee, LINE OA). The core problem
is **preventing overselling under concurrent orders**.

Stock is tracked per product as `on_hand` and `reserved`:

```
available = on_hand - reserved
```

An order first **reserves** stock (reserved goes up), then either **ships** it
(on_hand and reserved both go down) or **releases** it (reserved goes down).
`available` is always derived, never stored. The database refuses any row where
`on_hand - reserved < 0`, so no code path can persist an oversold balance.

Built so far: sign-in with owner and staff roles, products with opening stock,
stock in (one product or a whole delivery) and adjust, undoing a mistyped
entry, stock counts, a today page, the movement ledger, orders with
all-or-nothing reservation and the pack/ship/cancel flow, and the audit log.
LINE customers can order themselves through a LIFF form (`/line`); Shopee
orders are still entered by hand.

## Stack

| Area | Choice |
|---|---|
| Backend | Go (module floor 1.25, toolchain 1.26.8), Gin 1.12, pgx v5 (pgxpool), sqlc, golang-migrate, validator via Gin binding, log/slog, testify |
| Frontend | React 19, Vite 8, TypeScript 6.0, TanStack Router (file-based), TanStack Query, Tailwind CSS 4, shadcn/ui, Vitest + Testing Library |
| Database | PostgreSQL 17 (docker compose, host port 5433) |
| Tooling | golangci-lint v2, ESLint + Prettier, GitHub Actions |

Version pins that are deliberate, not stale:

- **Go toolchain go1.26.8.** golangci-lint 2.13.2 is built with go1.26 and
  panics ("file requires newer Go version go1.27") on a go1.27 standard
  library. `backend/Makefile` exports `GOTOOLCHAIN=go1.26.8` and CI uses
  1.26.8. Raise all three together once golangci-lint ships a go1.27 build.
- **TypeScript ~6.0.3.** typescript-eslint 8.x declares `typescript <6.1.0`.
  Do not bump to 6.1 or 7 until typescript-eslint supports it.

## Layout

```
api/openapi.yaml           Contract, written before handlers. Keep it in step with the code.
backend/
  cmd/api/main.go          Wiring only. Does not import gin.
  internal/
    config/                Env-only config (DATABASE_URL, HTTP_PORT, APP_ENV, GIN_MODE, STATIC_DIR, COOKIE_SECURE, LINE_*)
    platform/database/     pgxpool setup + startup ping
    platform/logger/       slog JSON handler
    http/                  package httpx: router, middleware, JSON error helpers
    health/                GET /healthz
    auth/, users/          Cookie sessions, password hashing, team accounts
    products/, stock/      Catalog, balances, stock in/adjust, the movement ledger
    orders/                All-or-nothing reservation and the pack/ship/cancel flow
    counts/                Stock counts: staff submit, owner approves into ADJUST movements
    line/                  LINE customer ordering (LIFF form, ID token check, status messages)
    audit/                 Who did what, written in the same transaction as the change
    platform/actor/        The signed-in user on context.Context
  cmd/seed/                Dev accounts and sample stock (make seed)
  db/migrations/           golang-migrate SQL, the single source of schema truth
  db/queries/              sqlc input
  db/sqlc/                 sqlc output (generated, committed, never hand-edited)
frontend/
  src/routes/              File-based routes; routeTree.gen.ts is generated and committed
  src/lib/api.ts           Typed fetch client, mirrors api/openapi.yaml
  src/components/ui/       shadcn/ui components (vendored; regenerate with the shadcn CLI)
docs/
  CODE-NOTES.md            Why the code is the way it is, grouped by area
  DESIGN.md                Visual design system (tokens, components, do and don't). Follow it for new UI.
  LINE-SETUP.md            Connecting a LINE Official Account for customer ordering
  adr/                     Architecture decision records (created with the first one)
```

Backend code is organised **by feature, not by layer**. A feature is one package
under `internal/` holding `handler.go`, `service.go` and `repository.go` as it
grows. Do not create `internal/handlers`, `internal/services` and so on.

## Commands

Backend, from `backend/` (needs GNU make; the root `.env` is loaded automatically):

| Command | Does |
|---|---|
| `make up` / `make down` | Start (and wait for healthy) / stop postgres |
| `make migrate-up` / `make migrate-down` | Apply all / roll back one migration |
| `make migrate-new name=add_orders` | Create a sequential migration pair |
| `make sqlc` | Regenerate `db/sqlc` |
| `make run` | Run the api on `HTTP_PORT` |
| `make seed` | Create dev accounts and sample stock (empty database only) |
| `make test` | Unit tests (no database needed) |
| `make test-integration` | Create and migrate the test database, then run `-tags integration` tests |
| `make lint` | golangci-lint, including the depguard gin rules |
| `make fmt` | gofmt + goimports |

Frontend, from `frontend/`: `npm run dev`, `npm run lint` (ESLint and Prettier
check), `npm run typecheck`, `npm test`, `npm run build`, `npm run format`.

## Gin rules

These are mandatory. Rules 1 and 7 are enforced by golangci-lint depguard.

1. `*gin.Context` must never leave `handler.go` or `internal/http`. Services and
   repositories take `context.Context`; handlers pass `c.Request.Context()`.
2. Use `gin.New()`, never `gin.Default()`. Our own slog request logger and
   recovery middleware are registered in `internal/http`.
3. Use `ShouldBind*`, never `Bind*` or `MustBind*`, and return failures through
   `httpx.RespondBindError` / `httpx.RespondError`.
4. Call `SetTrustedProxies` explicitly. It is `nil` for now.
5. Never use `*gin.Context` inside a goroutine. If unavoidable, use `c.Copy()`.
6. Gin mode comes from the `GIN_MODE` env var, validated in `internal/config`.
7. depguard denies `github.com/gin-gonic/gin` in every file except
   `internal/http/**` and `handler.go` / `handler_test.go`, and separately in
   any `service.go` or `repository.go` wherever it lives.

The request id is stored on the request's `context.Context`, so services can log
it via `httpx.RequestIDFrom(ctx)` without seeing gin.

## Database rules

- Schema changes happen **only** through a new migration (`make migrate-new`).
  Never edit an applied migration and never change the schema by hand.
- Every migration has a working down migration.
- Correctness constraints live in the database **and** in Go. Go validation
  gives good error messages; database constraints are the guarantee that
  holds under concurrency and against every code path.
- Stock changes are written together with a `stock_movements` row in the same
  transaction. The ledger must always explain the balance.
- SQL lives in `db/queries/*.sql` and is compiled by sqlc. No SQL strings in Go.
- Run `make sqlc` after changing migrations or queries, and commit the output.
- Handlers never serialise sqlc models directly. Map them to response types;
  `sqlc.User` carries `password_hash` with a JSON tag.

## Roles

- `owner` can do everything. `staff` can receive stock, submit stock counts,
  create orders and pack, ship or cancel them, but cannot adjust stock, approve
  counts, undo movements, create or edit products, manage users or read the
  audit log.
- Enforce a role with `httpx.RequireRole` on the route. Services read the
  signed-in user with `actor.From(ctx)`; they never see the cookie.
- Stock and order writes lock `stock_balances` rows in product id order
  (`stock.Lock`) before deciding anything, then write through `stock.Apply`.

## Code rules

- Wrap errors with context: `fmt.Errorf("create product: %w", err)`.
- No panics outside `main`. `main` only turns the error from `run()` into an
  exit code.
- Config comes from the environment only. `.env.example` is committed; `.env`
  never is.
- No emoji in code, comments, logs or commit messages.

## Comments

**Default: no comment.** A clear name is the explanation. Comments are English,
short and rare.

| Kind | Example | Rule |
|---|---|---|
| Section label | `// Handlers`, `{/* Header */}` | 1-3 words, only where a long file or JSX tree benefits from signposts |
| One-line API doc | `// NewPool returns a pool that has already answered a ping; the caller must Close it.` | Only when the name and types don't already say it. Never on every export |
| Trap | `// 404 not 403: anti-enumeration (docs/adr/0004)` | One line at the spot where the mistake would be made, pointing to docs for the why |
| Tool input | `//go:build`, `//nolint`, `// eslint-disable-next-line x -- why`, `// @ts-expect-error`, `-- name: X :one` | Exempt, tools read these |

Tool annotations are not comments. Deleting one silently breaks what reads it,
so keep them and do not add a prose line above that repeats them.

Everything else stays out of code:

- Rationale and history go to `docs/CODE-NOTES.md`, or an ADR in `docs/adr/`
  for a real decision.
- Narration is deleted. If a comment explains what a name means, rename the
  thing instead.

Budget and limits:

- Any comment block is at most 2 content lines, tool input excepted.
- Doc comments are not required on exported symbols. golangci-lint's
  `comments` exclusion preset stays on for that reason.
- The test: would a competent teammate fail to guess this? If not, delete it.
- Never duplicate a rule that lives in this file or `docs/`; copies drift.
- No changelog markers, commented-out code, "Note:" narration, or paragraphs
  explaining a UI choice.
- A PR that changes behaviour updates its note in `docs/CODE-NOTES.md` too.
- Applied migrations keep their original comments, since they are never edited.

## Testing

- Every step must build, lint and test clean before it is committed.
- Go: table-driven tests with testify. Unit tests must not need a database;
  depend on small interfaces declared by the consumer (see `health.Pinger`).
- HTTP handlers are tested through `httpx.NewRouter` with `httptest`, so
  middleware and routing are exercised too.
- Frontend: Vitest + Testing Library. Test behaviour through roles and text,
  not implementation details. Stub the api at `api.*`, not at `fetch`, in
  component tests. Render with `src/test/render.tsx` and build data with
  `src/test/fixtures.ts` instead of a local copy.
- Integration tests carry the `integration` build tag and run against
  `TEST_DATABASE_URL` (`make test-integration`, CI job `backend integration`).
  They create their own rows; never point them at the dev database.

## Git

- Conventional Commits: `type(scope): subject`, lowercase imperative subject,
  at most 72 characters. The body explains why when that is not obvious.
- No `Co-Authored-By` trailers and no "Generated with" lines.
- Work on short-lived branches named `feat/...`, `fix/...`, `chore/...` or
  `docs/...`, merged into `main` with a squash merge.
- Never commit `.env`, build output or `node_modules`.
