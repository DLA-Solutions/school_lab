ENV_FILE := web/.env
COMPOSE := docker compose --env-file $(ENV_FILE)

.PHONY: services-up services-down services-logs services-ps services-reset

# Start local infrastructure (PostgreSQL + Redis).
# Requires web/.env — run: cp web/.env.example web/.env
services-up:
	test -f $(ENV_FILE) || (echo "Missing $(ENV_FILE). Run: cp web/.env.example web/.env" && exit 1)
	$(COMPOSE) up -d

services-down:
	test -f $(ENV_FILE) && $(COMPOSE) down || docker compose down

services-logs:
	test -f $(ENV_FILE) && $(COMPOSE) logs -f || docker compose logs -f

services-ps:
	test -f $(ENV_FILE) && $(COMPOSE) ps || docker compose ps

# Stop containers and remove volumes (destructive — wipes local DB data).
services-reset:
	test -f $(ENV_FILE) && $(COMPOSE) down -v || docker compose down -v
