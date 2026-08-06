ENV_FILE := web/.env
COMPOSE := docker compose --env-file $(ENV_FILE)
COMPOSE_APP := $(COMPOSE) --profile app
WEB := $(COMPOSE_APP) run --rm web

.PHONY: check-env build up up-d down migrate seed setup console shell logs \
        services-up services-down services-logs services-ps services-reset design-system-docs \
        site-serve site-build

check-env:
	@test -f $(ENV_FILE) || (echo "Missing $(ENV_FILE). Run: cp web/.env.example web/.env" && exit 1)

# --- Full Docker stack (API + infrastructure) ---

build: check-env
	$(COMPOSE_APP) build web

# Foreground — API at http://localhost:3000/up
up: check-env
	$(COMPOSE_APP) up --build

# Background
up-d: check-env
	$(COMPOSE_APP) up -d --build

down:
	@test -f $(ENV_FILE) && $(COMPOSE_APP) down || docker compose --profile app down

migrate: check-env
	$(WEB) bin/rails db:migrate

seed: check-env
	$(WEB) bin/rails db:seed

# First-time setup: build image, start infra, prepare database.
setup: check-env build
	$(COMPOSE) up -d postgres redis
	$(WEB) bin/rails db:prepare

console: check-env
	$(WEB) bin/rails console

shell: check-env
	$(WEB) bash

logs:
	@test -f $(ENV_FILE) && $(COMPOSE_APP) logs -f web || docker compose --profile app logs -f web

# --- Infrastructure only (host Rails workflow) ---

# Start local infrastructure (PostgreSQL + Redis).
# Requires web/.env — run: cp web/.env.example web/.env
services-up: check-env
	$(COMPOSE) up -d postgres redis

services-down:
	@test -f $(ENV_FILE) && $(COMPOSE) down || docker compose down

services-logs:
	@test -f $(ENV_FILE) && $(COMPOSE) logs -f postgres redis || docker compose logs -f postgres redis

services-ps:
	@test -f $(ENV_FILE) && $(COMPOSE) ps || docker compose ps

# Stop containers and remove volumes (destructive — wipes local DB data).
services-reset:
	@test -f $(ENV_FILE) && $(COMPOSE_APP) down -v || docker compose --profile app down -v

# --- Design system static docs ---

design-system-docs:
	cd frontend/design-system-docs && npm install && npm run build

# --- Site static landing ---

site-serve:
	npx serve site/public

site-build:
	docker build -f site/Dockerfile .
