# TasteRoute — рабочий контракт проекта

Первоначальная длинная спецификация сохранена в `docs/original-spec.md`. Этот файл фиксирует актуальные решения и границы MVP.

## Что делаем

Бесплатное демо группового выбора еды:

1. Гость создаёт комнату и делится ссылкой.
2. Друзья подключаются по коду и свайпают блюда.
3. Совпавшие блюда формируют мэтчи.
4. Когда есть блюда из двух разных ресторанов, собирается маршрут по городу.
5. На маршруте гость оставляет имя и телефон.
6. Заявка сохраняется в Postgres и видна в `/admin`.

## Актуальные решения

- Всё должно быть бесплатным для демо.
- Telegram исключён.
- RabbitMQ, worker, CloudAMQP и отдельная очередь исключены.
- Лид пишется в БД; админка защищена `ADMIN_TOKEN` и заголовком `X-Admin-Token`.
- Redis нужен только для likes; используется бесплатный Upstash.
- Маршрут строится только при мэтчах в **двух разных ресторанах**.
- Порог мэтча: `min(2, ceil(participants / 2))`.
- Демо-данные: 20 ресторанов и 100 блюд, город Тольятти.
- Никаких реальных платежей, доставки, внешних карт и чужих данных.
- Не использовать данные из `/opt/rosatom-bdc-dev-ext`, `/opt/service`, `/opt/traefik`, `registry.gpty`.

## Стек

- Backend: Go 1.23, chi, pgx, goose, JWT, gorilla/websocket, go-redis.
- DB: PostgreSQL (Supabase Free).
- Cache: Redis (Upstash Free).
- Frontend: Vite, React 18, TypeScript, Tailwind, React Query, framer-motion, PWA.
- Runtime: Docker.
- Deploy: Render Free Web Service + Static Site, GitHub Actions.
- CI: GitHub Actions.

## API

Базовый префикс: `/tasteroute/api`.

- `GET /healthz`
- `POST /rooms` → `{room_id, code, city}`
- `GET /rooms/{code}`
- `POST /rooms/{code}/join` → `{participant_id, token, name}`
- `GET /rooms/{code}/catalog` — Bearer JWT
- `GET /rooms/{code}/route` — Bearer JWT, 409 пока нет двух ресторанов
- `POST /leads` — Bearer JWT, `{name, phone, comment}`
- `GET /admin/leads` — `X-Admin-Token`
- `GET /ws?room=CODE&token=JWT` — WebSocket

WS-сообщения:

- клиент → сервер: `{"type":"swipe","dish_id":"...","liked":true}`
- сервер → клиент: `participants`, `match`, `error`

## Переменные окружения

Обязательные для API:

- `DATABASE_URL`
- `REDIS_URL`
- `GUEST_JWT_SECRET` — минимум 16 символов
- `ADMIN_TOKEN` — минимум 8 символов

Опциональные:

- `APP_ENV` — по умолчанию `development`
- `PORT` — по умолчанию `8080`
- `APP_PATH_PREFIX` — по умолчанию `/tasteroute/api`
- `CORS_ORIGINS` — через запятую
- `SEEDS_DIR` — по умолчанию `seeds`

Frontend:

- `VITE_API_BASE_URL` — по умолчанию `/tasteroute/api`

## Команды

Windows PowerShell, локальная установка:

```powershell
$env:GOTOOLCHAIN='local'
go test ./...
go vet ./...
go build ./...
```

Frontend:

```powershell
cd web
pnpm install
pnpm lint
pnpm build
```

Полный локальный стек:

```powershell
docker compose up -d --build
docker compose --profile seed run --rm seed
```

Проверка сценария:

```powershell
node scripts/smoke.mjs
```

Миграции и seed напрямую:

```powershell
$env:DATABASE_URL='postgres://...'
go run ./cmd/migrate up
go run ./cmd/seed
```

## Правила работы

- Секреты не коммитить; `.env` в `.gitignore`.
- Реальный `CP_OS_PASS`, засветившийся в чате, не использовать и ротировать.
- Не добавлять Telegram, RabbitMQ, worker и CloudAMQP без нового решения пользователя.
- Не ломать бесплатный сценарий деплоя.
- После изменений backend: `gofmt`, `go test ./...`, `go vet ./...`.
- После изменений frontend: `pnpm lint`, `pnpm build`.
- Для проверки API/WS использовать `scripts/smoke.mjs`.

## Definition of done

- `docker compose up -d --build` поднимает web, api, postgres, redis.
- `node scripts/smoke.mjs` проходит: комната, два свайпа, маршрут, лид, админка.
- `pnpm build` собирает PWA.
- `render.yaml` описывает бесплатный деплой.
- README позволяет повторить запуск и деплой с нуля.
