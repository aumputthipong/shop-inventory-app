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

> Status: scaffold. The API serves a health check, the schema and sqlc pipeline
> are in place, and the frontend shows live backend health. Products, stock
> movements and channel integrations come next.

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
make run           # api on http://localhost:8080
```

```sh
curl -i http://localhost:8080/healthz
# HTTP/1.1 200 OK
# {"status":"ok","db":"ok"}
```

`/healthz` answers `503 {"status":"degraded","db":"error"}` when the database is
unreachable.

In a second terminal:

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api and /healthz to :8080
```

## Checks

```sh
# backend/
make test
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
docker-compose.yml  PostgreSQL for local development
```

See [CLAUDE.md](CLAUDE.md) for architecture rules, conventions and the reasoning
behind the pinned tool versions.
