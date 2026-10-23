# TasteRoute

Бесплатное демо группового выбора еды: комната, свайпы блюд, мэтчи, маршрут по ресторанам и заявка гостя в админке.

## Что умеет

- Создание комнаты и вход по 6-символьному коду или ссылке.
- До 8 участников, гостевой JWT на 24 часа.
- Каталог из 20 ресторанов и 100 блюд Тольятти.
- Свайпы в реальном времени через WebSocket.
- Лайки в Redis; мэтч по формуле `min(2, ceil(participants / 2))`.
- Маршрут только при совпадениях в двух разных ресторанах.
- Лид с именем и телефоном сохраняется в PostgreSQL.
- Админка `/admin` по `ADMIN_TOKEN`.
- PWA-манифест и service worker.

Telegram, RabbitMQ, worker и CloudAMQP в проект не входят.

## Стек

- Go 1.23, chi, pgx, goose, JWT, gorilla/websocket, go-redis.
- PostgreSQL и Redis.
- React 18, Vite, TypeScript, Tailwind, React Query, framer-motion.
- Docker, Render Free, Supabase Free, Upstash Free, GitHub Actions.

## Быстрый старт в Docker

Нужны Docker Desktop и свободные порты `5173`, `8080`, `5432`, `6379`.

```powershell
docker compose up -d --build
docker compose --profile seed run --rm seed
```

Открыть:

- Web: http://localhost:5173
- API health: http://localhost:8080/tasteroute/api/healthz
- Админка: http://localhost:5173/admin, локальный токен `dev-admin-token` или `ADMIN_TOKEN` из `.env`

`migrate` запускается автоматически при старте API. Seed выполняется отдельной командой.

Если в корне есть локальный `.env`, Docker Compose использует из него `GUEST_JWT_SECRET`, `ADMIN_TOKEN` и `CORS_ORIGINS`.

Проверка полного сценария:

```powershell
node scripts/smoke.mjs
```

## Локальная разработка без Docker для приложения

1. Поднять только инфраструктуру:

```powershell
docker compose -f compose.dev.yml up -d
```

2. Создать `.env` по примеру `.env.example` или задать переменные в PowerShell:

```powershell
$env:DATABASE_URL='postgres://tasteroute:tasteroute@localhost:5432/tasteroute?sslmode=disable'
$env:REDIS_URL='redis://localhost:6379/0'
$env:GUEST_JWT_SECRET='dev-only-secret-change-me-0123456789'
$env:ADMIN_TOKEN='dev-admin-token'
$env:CORS_ORIGINS='http://localhost:5173,http://127.0.0.1:5173'
```

3. Применить миграции и загрузить каталог:

```powershell
$env:GOTOOLCHAIN='local'
go run ./cmd/migrate up
go run ./cmd/seed
```

4. Запустить API:

```powershell
go run ./cmd/api
```

5. Запустить frontend:

```powershell
cd web
pnpm install
pnpm dev
```

Vite проксирует `/tasteroute/api` на `http://localhost:8080`, поэтому WebSocket и API работают с того же origin.

На Windows PowerShell может блокировать `pnpm.ps1` из-за execution policy. В этом случае используйте `pnpm.cmd` или полный путь к нему.

## Переменные окружения

| Переменная | Обязательна | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | да | PostgreSQL DSN |
| `REDIS_URL` | да | Redis/Upstash DSN |
| `GUEST_JWT_SECRET` | да | подпись гостевых JWT, минимум 16 символов |
| `ADMIN_TOKEN` | да | доступ к `/admin/leads`, минимум 8 символов |
| `APP_ENV` | нет | `development` или `production` |
| `PORT` | нет | порт API, по умолчанию `8080` |
| `APP_PATH_PREFIX` | нет | префикс API, по умолчанию `/tasteroute/api` |
| `CORS_ORIGINS` | нет | origin веб-клиента через запятую |
| `SEEDS_DIR` | нет | каталог seed-файлов, по умолчанию `seeds` |
| `VITE_API_BASE_URL` | нет | база API на frontend, по умолчанию `/tasteroute/api` |

## API

Базовый путь: `/tasteroute/api`.

| Метод | Путь | Доступ |
| --- | --- | --- |
| `GET` | `/healthz` | без авторизации |
| `POST` | `/rooms` | без авторизации |
| `GET` | `/rooms/{code}` | без авторизации |
| `POST` | `/rooms/{code}/join` | без авторизации |
| `GET` | `/rooms/{code}/catalog` | Bearer JWT |
| `GET` | `/rooms/{code}/route` | Bearer JWT |
| `POST` | `/leads` | Bearer JWT |
| `GET` | `/admin/leads` | `X-Admin-Token` |
| `GET` | `/ws?room=CODE&token=JWT` | WebSocket |

WebSocket:

```json
{"type":"swipe","dish_id":"...","liked":true}
```

Сервер присылает `participants`, `match` и `error`.

## Проверки

Backend:

```powershell
$env:GOTOOLCHAIN='local'
gofmt -l .
go vet ./...
go test ./...
```

Frontend:

```powershell
cd web
pnpm lint
pnpm build
```

Smoke-тест создаёт комнату, подключает двух гостей, свайпает два блюда из разных ресторанов, проверяет мэтчи, маршрут, лид и админку:

```powershell
node scripts/smoke.mjs
```

Для удалённого API:

```powershell
$env:API_BASE='https://tasteroute-api.onrender.com/tasteroute/api'
$env:ADMIN_TOKEN='...'
node scripts/smoke.mjs
```

## Бесплатный деплой

### 1. GitHub

Создать публичный репозиторий `Grosterx/tasteroute` и запушить `main`. CI проверит Go и frontend.

### 2. Supabase

1. Создать бесплатный проект.
2. Взять строку подключения Session pooler (IPv4) из Database settings.
3. Использовать её как `DATABASE_URL` с `?sslmode=require`.
4. Пароль из строки подключения не коммитить.

### 3. Upstash

1. Создать бесплатную Redis-базу.
2. Скопировать `rediss://...` в `REDIS_URL`.
3. Убедиться, что Render сможет подключиться по TLS.

### 4. Render

1. New → Blueprint → подключить репозиторий.
2. Render прочитает `render.yaml` и создаст:
   - `tasteroute-api` — Docker web service;
   - `tasteroute-web` — static site.
3. Заполнить `DATABASE_URL` и `REDIS_URL` в API-сервисе.
4. `GUEST_JWT_SECRET` и `ADMIN_TOKEN` Render сгенерирует сам.
5. Если имена сервисов заняты, обновить:
   - `CORS_ORIGINS` в API;
   - `VITE_API_BASE_URL` у static site;
   - URL в README и `agents.md`.

API при старте выполняет `./migrate up`, затем запускает сервер. Это описано в `dockerCommand`.

### 5. Каталог в БД

Добавить в GitHub Actions secret `DATABASE_URL` и вручную запустить workflow **DB setup**. Он выполнит миграции и seed.

Либо локально:

```powershell
$env:DATABASE_URL='postgres://...'
$env:GOTOOLCHAIN='local'
go run ./cmd/migrate up
go run ./cmd/seed
```

### 6. Проверка

- Web: `https://tasteroute-web.onrender.com`
- API: `https://tasteroute-api.onrender.com/tasteroute/api/healthz`
- Админка: `https://tasteroute-web.onrender.com/admin`
- `ADMIN_TOKEN` смотреть в Environment API-сервиса Render.

## Ограничения бесплатного тарифа

- Render Free засыпает после простоя; первый запрос может занять до минуты.
- Supabase Free может приостанавливать проект при неактивности.
- Upstash Free имеет лимиты команд и памяти.
- Демо рассчитано на один город — Тольятти.
- Нет оплаты, доставки и интеграции с внешними картами.

## Структура

```text
cmd/
  api/        HTTP + WebSocket сервер
  migrate/    goose-миграции
  seed/       загрузка ресторанов и блюд
internal/
  auth/       гостевые JWT
  catalog/    каталог
  config/     env
  httpapi/    HTTP-хендлеры, CORS, авторизация
  lead/       заявки
  room/       комнаты, свайпы, мэтчи
  route/      маршрут
  store/      Postgres + Redis
  ws/         WebSocket hub
migrations/   SQL-схема
seeds/        демо-данные
web/          React PWA
scripts/      smoke-тест
```

## Секреты

- Не коммитить `.env`, токены и пароли.
- Реальный `CP_OS_PASS`, засветившийся в чате, не использовать; сменить пароль.
- `ADMIN_TOKEN` и `GUEST_JWT_SECRET` для production должны быть длинными случайными строками.
- Если секрет попал в git, считать его скомпрометированным и ротировать.
