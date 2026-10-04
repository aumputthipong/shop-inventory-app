# Loads ../.env when present; copy ../.env.example to start.
-include ../.env
export DATABASE_URL HTTP_PORT APP_ENV GIN_MODE POSTGRES_PORT
export SEED_OWNER_EMAIL SEED_OWNER_PASSWORD SEED_STAFF_EMAIL SEED_STAFF_PASSWORD SEED_SAMPLE_DATA TEST_DATABASE_URL POSTGRES_USER
export STATIC_DIR COOKIE_SECURE LINE_MODE LINE_LOGIN_CHANNEL_ID LINE_LIFF_ID LINE_CHANNEL_ACCESS_TOKEN LINE_OA_ID DEMO_ACCOUNTS

# Pinned for golangci-lint, see "Version pins" in CLAUDE.md.
# Override with e.g. `make test GOTOOLCHAIN=local`.
export GOTOOLCHAIN := go1.26.8

COMPOSE        := docker compose -f ../docker-compose.yml
MIGRATIONS_DIR := db/migrations

.DEFAULT_GOAL := help

.PHONY: help up down migrate-up migrate-down migrate-new sqlc run seed demo-reset test test-integration lint fmt require-db-url

# Recipes run under cmd.exe on Windows: no POSIX shell syntax.
help:
	$(info up             Start postgres and wait until it is healthy)
	$(info down           Stop postgres (the data volume is kept))
	$(info migrate-up     Apply all pending migrations)
	$(info migrate-down   Roll back the most recent migration)
	$(info migrate-new    Create a migration pair: make migrate-new name=add_orders)
	$(info sqlc           Regenerate db/sqlc from migrations and queries)
	$(info run            Run the api)
	$(info seed           Create dev accounts and sample stock (empty database only))
	$(info demo-reset     Wipe the online demo database and refill it: make demo-reset DEMO_DATABASE_URL=...)
	$(info test           Run unit tests (no database required))
	$(info test-integration Run database tests, including the oversell race test)
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

seed: require-db-url
	go run ./cmd/seed

# The demo accounts are public on purpose: the README invites anyone to sign in.
DEMO_OWNER_EMAIL    ?= owner@demo.shop
DEMO_OWNER_PASSWORD ?= demo-owner-2026
DEMO_STAFF_EMAIL    ?= staff@demo.shop
DEMO_STAFF_PASSWORD ?= demo-staff-2026

demo-reset: export DATABASE_URL = $(DEMO_DATABASE_URL)
demo-reset: export APP_ENV = development
demo-reset: export SEED_SAMPLE_DATA = true
demo-reset: export SEED_OWNER_EMAIL = $(DEMO_OWNER_EMAIL)
demo-reset: export SEED_OWNER_PASSWORD = $(DEMO_OWNER_PASSWORD)
demo-reset: export SEED_STAFF_EMAIL = $(DEMO_STAFF_EMAIL)
demo-reset: export SEED_STAFF_PASSWORD = $(DEMO_STAFF_PASSWORD)
demo-reset:
	$(if $(DEMO_DATABASE_URL),,$(error usage: make demo-reset DEMO_DATABASE_URL=<demo database url>, never the dev one))
	migrate -path $(MIGRATIONS_DIR) -database "$(DEMO_DATABASE_URL)" down -all
	migrate -path $(MIGRATIONS_DIR) -database "$(DEMO_DATABASE_URL)" up
	go run ./cmd/seed

run: require-db-url
	go run ./cmd/api

test:
	go test ./...

test-integration:
	$(if $(TEST_DATABASE_URL),,$(error TEST_DATABASE_URL is not set: see .env.example))
	-$(COMPOSE) exec -T postgres createdb -U $(or $(POSTGRES_USER),shopinv) shopinv_test
	migrate -path $(MIGRATIONS_DIR) -database "$(TEST_DATABASE_URL)" up
	go test -tags integration -count=1 ./...

lint:
	golangci-lint run ./...

fmt:
	golangci-lint fmt ./...

require-db-url:
	$(if $(DATABASE_URL),,$(error DATABASE_URL is not set: copy .env.example to .env at the repo root))
