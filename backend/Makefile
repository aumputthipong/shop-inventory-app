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

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-14s %s\n", $$1, $$2}'

up: ## Start postgres and wait until it is healthy
	$(COMPOSE) up -d --wait

down: ## Stop postgres (the data volume is kept)
	$(COMPOSE) down

migrate-up: require-db-url ## Apply all pending migrations
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

migrate-down: require-db-url ## Roll back the most recent migration
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

migrate-new: ## Create a migration pair: make migrate-new name=add_orders
	@test -n "$(name)" || { echo "usage: make migrate-new name=<snake_case_name>"; exit 1; }
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq -digits 6 $(name)

sqlc: ## Regenerate db/sqlc from migrations and queries
	sqlc generate

run: require-db-url ## Run the api
	go run ./cmd/api

test: ## Run unit tests (no database required)
	go test ./...

lint: ## Run golangci-lint, including the depguard gin rules
	golangci-lint run ./...

fmt: ## Format code with gofmt and goimports
	golangci-lint fmt ./...

require-db-url:
	@test -n "$(DATABASE_URL)" || { echo "DATABASE_URL is not set: copy .env.example to .env at the repo root"; exit 1; }
