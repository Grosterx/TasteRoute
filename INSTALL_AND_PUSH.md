# TasteRoute — инструкция по установке и запуску

TasteRoute — веб-приложение для группового выбора ресторана/блюд с мэтчами и построением маршрута. 
Подходит для запуска на локальной машине (Windows, Linux, macOS).

## 1. Требования

Перед началом установи:

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (обязательно включить)
- [Node.js LTS](https://nodejs.org/) (проверено на v22)
- [pnpm](https://pnpm.io/installation) (рекомендуется через corepack: `corepack enable`)
- [Go 1.23](https://go.dev/dl/) (только если нужен запуск без Docker)

Проверка версий (PowerShell):

```powershell
git --version
node --version
pnpm --version
go version
docker version
docker compose version
```

## 2. Клонирование репозитория

```powershell
git clone https://github.com/<ТВОЙ_НИК>/TasteRoute.git
cd TasteRoute
```

> Замени `<ТВОЙ_НИК>` на свой GitHub username. После клонирования можешь пушить в свой форк/репозиторий.

## 3. Настройка переменных окружения

Скопируй пример env-файла:

```powershell
Copy-Item .env.example .env
```

Открой `.env` и при необходимости поправь значения. Базовые значения уже рабочие для локального запуска:

- `GUEST_JWT_SECRET` — секрет для гостевых JWT (минимум 16 символов)
- `ADMIN_TOKEN` — токен для админки (`/admin`), заголовок `X-Admin-Token`
- `CORS_ORIGINS` — список разрешённых Origin через запятую
- `DATABASE_URL` / `REDIS_URL` — для локального Docker менять не нужно

> `.env` уже в `.gitignore`, никогда не коммить секреты.

Для фронтенда при необходимости скопируй:

```powershell
Copy-Item web\.env.example web\.env
```

## 4. Запуск через Docker (рекомендуется)

### Первый запуск

```powershell
docker compose up -d --build
docker compose --profile seed run --rm seed
```

После старта будут доступны:

| Сервис | URL | Примечание |
| --- | --- | --- |
| Фронтенд | http://localhost:5173 | Основной сайт |
| API | http://localhost:8080/tasteroute/api | REST API |
| Healthcheck | http://localhost:8080/tasteroute/api/healthz | Должен вернуть `{"ok":true}` |
| Админка | http://localhost:5173/admin | Требует `ADMIN_TOKEN` из `.env` |

### Повторный запуск

```powershell
docker compose up -d
```

### Остановка

```powershell
docker compose down
```

### Полный сброс с данными

```powershell
docker compose down -v
docker compose up -d --build
docker compose --profile seed run --rm seed
```

## 5. Локальная разработка без Docker (опционально)

### Backend

```powershell
$env:GOTOOLCHAIN='local'
go mod download
go run ./cmd/migrate up
go run ./cmd/seed
go run ./cmd/api
```

API будет на http://localhost:8080

### Frontend

```powershell
cd web
pnpm install
pnpm dev
```

Фронт на http://localhost:5173 (проксирует `/tasteroute/api` на API)

## 6. Проверка работоспособности

Smoke-тест:

```powershell
$env:API_BASE='http://localhost:8080/tasteroute/api'
$env:ADMIN_TOKEN='admin-local-demo-123456'
node scripts/smoke.mjs
```

Если видишь `smoke ok: room=...` — всё работает.

## 7. Как запушить проект в свой GitHub

1. Создай новый репозиторий на [github.com](https://github.com/new)
2. Удали старый remote:

```powershell
git remote remove origin
```

3. Добавь свой:

```powershell
git remote add origin https://github.com/<ТВОЙ_НИК>/<ИМЯ_РЕПОЗИТОРИЯ>.git
```

4. Запушь:

```powershell
git branch -M main
git add .
git commit -m "chore: initial setup"
git push -u origin main
```

> `.env` не коммитится. Перед пушем проверь `git status`.

## 8. Доступ для друзей через интернет

### Cloudflare Tunnel (быстро и бесплатно)

1. Скачай [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
2. Убедись, что стек запущен: `docker compose ps`
3. Запусти туннель:

```powershell
.\cloudflared.exe tunnel --url http://localhost:5173 --no-autoupdate
```

4. Скопируй выданный URL вида `https://xxx.trycloudflare.com` и скинь друзьям
5. Если меняешь URL — добавь его в `CORS_ORIGINS` в `.env` и перезапусти API: `docker compose up -d --force-recreate api`

**Важно:** ПК должен быть включён, Docker и туннель должны работать. Quick tunnel не требует регистрации.

## 9. Полезные команды

```powershell
docker compose ps
docker compose logs -f api
docker compose logs -f web
docker compose up -d --build
cd web && pnpm lint && pnpm build
go test ./...
go vet ./...
```

## 10. Структура проекта

| Путь | Описание |
| --- | --- |
| `cmd/api` | Точка входа Go API |
| `cmd/migrate` | Миграции БД (goose) |
| `cmd/seed` | Загрузка демо-данных |
| `internal/` | Бизнес-логика |
| `migrations/` | SQL-миграции |
| `seeds/` | Демо-каталог |
| `web/` | Фронтенд (React + Vite + Tailwind + PWA) |
| `scripts/smoke.mjs` | E2E-тест |
| `docker-compose.yml` | Локальный стек |
| `Dockerfile` | Сборка API |
| `.env.example` | Пример переменных окружения |
