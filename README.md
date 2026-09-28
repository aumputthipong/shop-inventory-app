# shop-inventory-app

A multi-channel inventory back-office. One shop sells the same stock through its
store, Shopee and LINE OA, and this system keeps a single source of truth for
that stock.

The interesting problem is **overselling under concurrent orders**: two channels
must never sell the last unit twice. Stock is modelled with reservations:

```
available = on_hand - reserved
```

An order reserves stock before it ships, and the database itself rejects any
balance where `on_hand - reserved` would go negative.

> Status: the core loop works end to end. Owners and staff sign in, manage
> products, receive and adjust stock, and take orders from the store, Shopee or
> LINE (entered by hand). Every order reserves all its lines or none, every
> stock change is in a ledger, and every action is in an audit log. Channel
> webhooks, reservation expiry and returns come next.

## Proving it does not oversell

`backend/internal/orders/oversell_integration_test.go` fires 40 concurrent
orders at 5 units of one product against a real postgres and asserts that
exactly 5 succeed, the balance is 5 reserved with 0 available, and the ledger
rebuilds the balance. A second test races multi-item orders and checks that no
order was ever half reserved. Run them with `make test-integration`.

## Stack

- **Backend:** Go, Gin, pgx v5, sqlc, golang-migrate, log/slog
- **Frontend:** React 19, Vite, TypeScript, TanStack Router and Query, Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL 17
- **Tooling:** golangci-lint, ESLint, Prettier, Vitest, GitHub Actions

## Prerequisites

| Tool | Notes |
|---|---|
| Go 1.25+ | The Makefile runs everything on go1.26.8 and downloads it automatically |
| Node 22.12+ | Required by Vite 8 |
| Docker | For postgres |
| GNU make | Windows: `scoop install make` or `winget install ezwinports.make` |
| [golang-migrate](https://github.com/golang-migrate/migrate) CLI | `migrate` |
| [sqlc](https://sqlc.dev) | Only needed to regenerate `backend/db/sqlc` |
| [golangci-lint](https://golangci-lint.run) v2 | For `make lint` |

## Getting started

```sh
cp .env.example .env

cd backend
make up            # postgres on localhost:5433, waits until healthy
make migrate-up
make seed          # dev accounts and sample stock, empty database only
make run           # api on http://localhost:8080
```

```sh
curl -i http://localhost:8080/healthz
# HTTP/1.1 200 OK
# {"status":"ok","db":"ok"}
```

`/healthz` answers `503 {"status":"degraded","db":"error"}` when the database is
unreachable.

`make seed` creates `owner@shop.local` and `staff@shop.local`; their passwords
are `SEED_OWNER_PASSWORD` and `SEED_STAFF_PASSWORD` in `.env`.

In a second terminal:

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api and /healthz to :8080
```

## Running the whole shop with Docker

One image holds the api, the built frontend and the seed command. Only Docker
is needed:

```sh
cp .env.example .env               # set POSTGRES_PASSWORD and the SEED_* accounts
docker compose --profile app up -d --build
docker compose --profile app run --rm -e SEED_SAMPLE_DATA=false --entrypoint /app/seed app
```

The shop is then on `http://localhost:8080` (`APP_PORT` changes it). Migrations
run automatically on every `up`. The seed step creates the owner and staff
accounts once; it refuses to add sample data outside development.

Cookies are sent over plain http by default so the shop works on its own
network. Put it behind HTTPS and set `COOKIE_SECURE=true` before exposing it to
the internet.

## Checks

```sh
# backend/
make test
make test-integration   # needs postgres from make up
make lint

# frontend/
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same checks on every push to `main` and every pull request.

## Project layout

```
api/openapi.yaml    API contract
backend/            Go api, migrations, sqlc queries and generated code
frontend/           React app
docker-compose.yml  PostgreSQL for development; the app profile runs everything
Dockerfile          One image: api, seed command and built frontend
```

See [CLAUDE.md](CLAUDE.md) for architecture rules, conventions and the reasoning
behind the pinned tool versions.
