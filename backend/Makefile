# Backend developer commands. Run from backend/.
#
# Variables from ../.env are loaded when that file exists, so DATABASE_URL and
# friends do not need to be exported by hand. Copy ../.env.example to start.
-include ../.env
export DATABASE_URL HTTP_PORT APP_ENV GIN_MODE POSTGRES_PORT

# golangci-lint 2.13.2 is built with go1.26 and panics ("file requires newer
# Go version go1.27") when it type-checks a go1.27 standard library. Forcing
# the toolchain keeps run, test and lint on the version the linter supports.
# Override on the command line, e.g. `make test GOTOOLCHAIN=local`.
export GOTOOLCHAIN := go1.26.8

COMPOSE        := docker compose -f ../docker-compose.yml
MIGRATIONS_DIR := db/migrations

.DEFAULT_GOAL := help

.PHONY: help up down migrate-up migrate-down migrate-new sqlc run test lint fmt require-db-url

# Recipes run under cmd.exe on Windows: no POSIX shell syntax.
help:
	$(info up             Start postgres and wait until it is healthy)
	$(info down           Stop postgres (the data volume is kept))
	$(info migrate-up     Apply all pending migrations)
	$(info migrate-down   Roll back the most recent migration)
	$(info migrate-new    Create a migration pair: make migrate-new name=add_orders)
	$(info sqlc           Regenerate db/sqlc from migrations and queries)
	$(info run            Run the api)
	$(info test           Run unit tests (no database required))
	$(info lint           Run golangci-lint, including the depguard gin rules)
	$(info fmt            Format code with gofmt and goimports)
	@exit 0

up:
	$(COMPOSE) up -d --wait

down:
	$(COMPOSE) down

migrate-up: require-db-url
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

migrate-down: require-db-url
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

migrate-new:
	$(if $(name),,$(error usage: make migrate-new name=<snake_case_name>))
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq -digits 6 $(name)

sqlc:
	sqlc generate

run: require-db-url
	go run ./cmd/api

test:
	go test ./...

lint:
	golangci-lint run ./...

fmt:
	golangci-lint fmt ./...

require-db-url:
	$(if $(DATABASE_URL),,$(error DATABASE_URL is not set: copy .env.example to .env at the repo root))
