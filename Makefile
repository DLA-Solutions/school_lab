ENV_FILE := web/.env
COMPOSE := docker compose --env-file $(ENV_FILE)
COMPOSE_APP := $(COMPOSE) --profile app
WEB := $(COMPOSE_APP) run --rm web

.PHONY: check-env build up up-d down migrate seed setup console shell logs \
        services-up services-down services-logs services-ps services-reset \
        frontend-setup app-setup app-dev backoffice-setup backoffice-dev \
        mobile-setup mobile-dev design-system-docs design-system-docs-dev \
        site-serve site-build dev ci ci-fast install-hooks

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

# --- Frontend layers (host Node) ---

# API (Docker, detached) + school SPA + backoffice SPA.
# First time: `make setup` then this. Ctrl+C stops the SPAs; `make down` stops the API.
dev: up-d
	@test -f frontend/app/.env || cp frontend/app/.env.example frontend/app/.env
	@test -d frontend/app/node_modules || (cd frontend/app && npm install)
	@test -d frontend/backoffice/node_modules || (cd frontend/backoffice && npm install)
	@echo ""
	@echo "API         http://localhost:3000/up"
	@echo "School SPA  http://localhost:5173"
	@echo "Backoffice  http://localhost:5175"
	@echo "Ctrl+C stops the SPAs. Run \`make down\` to stop the API."
	@echo ""
	@trap 'kill 0' INT TERM; \
	(cd frontend/app && npm run dev) & \
	(cd frontend/backoffice && npm run dev) & \
	wait

# First-time: copy env files and install deps for every client surface.
frontend-setup: app-setup backoffice-setup mobile-setup
	cd frontend/design-system-docs && npm install

# School SPA — http://localhost:5173
app-setup:
	@test -f frontend/app/.env || cp frontend/app/.env.example frontend/app/.env
	cd frontend/app && npm install

app-dev:
	@test -f frontend/app/.env || cp frontend/app/.env.example frontend/app/.env
	@test -d frontend/app/node_modules || (cd frontend/app && npm install)
	cd frontend/app && npm run dev

# Backoffice SPA — http://localhost:5175
backoffice-setup:
	cd frontend/backoffice && npm install

backoffice-dev:
	@test -d frontend/backoffice/node_modules || (cd frontend/backoffice && npm install)
	cd frontend/backoffice && npm run dev

# Mobile (Expo)
mobile-setup:
	@test -f mobile/.env || cp mobile/.env.example mobile/.env
	cd mobile && npm install

mobile-dev:
	@test -f mobile/.env || cp mobile/.env.example mobile/.env
	@test -d mobile/node_modules || (cd mobile && npm install)
	cd mobile && npm start

# --- Design system static docs ---

design-system-docs:
	cd frontend/design-system-docs && npm install && npm run build

design-system-docs-dev:
	@test -d frontend/design-system-docs/node_modules || (cd frontend/design-system-docs && npm install)
	cd frontend/design-system-docs && npm run dev

# --- Site static landing ---

site-serve:
	npx serve site/dist

site-build:
	cd site && npm ci && npm run build
	docker build -f site/Dockerfile .

# --- Local CI (path filters match .github/workflows/ci.yml) ---

ci:
	bin/ci

ci-fast:
	bin/ci --fast

install-hooks:
	bin/install-git-hooks
