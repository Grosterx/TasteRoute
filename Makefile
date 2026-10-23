.PHONY: up down logs test lint migrate seed smoke

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f api web

test:
	go test ./...

lint:
	test -z "$$(gofmt -l .)"
	go vet ./...
	cd web && pnpm lint

migrate:
	go run ./cmd/migrate up

seed:
	go run ./cmd/seed

smoke:
	node scripts/smoke.mjs
