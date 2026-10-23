Ниже — готовый `agent.md`. Он написан так, чтобы **OpenCode не уходил в свободное плавание**: жёсткие ограничения, одна задача = один маленький PR, явные «стоп-условия». Язык — русский, идентификаторы — английские.

Создай файл в корне репозитория `tasteroute/agent.md`.

---

```markdown
# agent.md — TasteRoute (MVP)

> Этот файл — контракт для AI-агента (OpenCode) и людей-ревьюеров.
> Читай его полностью перед любой задачей. Не импровизируй.

---

## 0. Что за проект

**TasteRoute** — веб-сервис (PWA) для группового выбора гастрономического
маршрута в незнакомом городе. Сценарий:

1. Организатор создаёт «комнату», кидает ссылку друзьям.
2. Участники свайпают карточки блюд/ресторанов в реальном времени.
3. При совпадении («мэтч») собирается маршрут из 2–3 точек.
4. Лид уходит в ресторан через Telegram-бота.

MVP: один город (Тольятти), 20 ресторанов, до 8 человек в комнате.

---

## 1. Жёсткие ограничения (НЕ НАРУШАТЬ)

Агент **обязан** остановиться и спросить, если задача требует нарушить любое из правил ниже.

- ❌ **Никакого LLM** в коде MVP. Парсинг запроса — только теги/фильтры.
- ❌ **Никакого PostGIS, OSRM, TSP-библиотек.** Только `haversine` + nearest neighbor.
- ❌ **Никакого Keycloak/AtomID для туристов.** Гостевой JWT.
- ❌ **Никаких новых микросервисов** сверх: `frontend`, `api`, `worker`.
- ❌ **Никаких Kubernetes, Helm, Prometheus, Grafana, Sentry, OTel.**
- ❌ **Никаких новых Go-зависимостей** без явного подтверждения в задаче.
- ❌ **Никаких правок** в чужих репозиториях (`/opt/service`, `/opt/traefik`, `rosatom-bdc-*`).
- ❌ **Никаких секретов в коде и в git.** Только env-переменные из GitLab Variables.
- ❌ **Никаких OpenSearch, OCR, data_keeper** в TasteRoute.
- ❌ **Никаких рефакторингов «по пути».** Только то, что в задаче.

**Секреты, которые утекли в чат ранее, должны быть ротированы до первого деплоя.**
(Пароли Postgres, RabbitMQ, `CP_OS_PASS`.)

---

## 2. Стек (не менять)

| Слой | Выбор |
|---|---|
| Backend | Go 1.23, `chi`, `net/http`, `slog` |
| WS | `gorilla/websocket` |
| БД | PostgreSQL 17 (общий контейнер), `pgx v5`, миграции `goose` |
| Кэш | Redis 8 (общий контейнер), `go-redis v9` |
| Очередь | RabbitMQ (общий), `amqp091-go`, одна очередь `tasteroute.leads` |
| Auth | гостевой JWT, `golang-jwt/jwt v5` |
| Frontend | React 18 + TS + Vite + Tailwind + shadcn/ui + Framer Motion + TanStack Query + `vite-plugin-pwa` |
| Деплой | Docker Compose + Traefik v3 + registry.gpty + GitLab CI |

---

## 3. Структура репозитория (эталон)

```
tasteroute/
  cmd/
    api/main.go
    worker/main.go
  internal/
    config/       # env, дефолты, валидация
    store/        # pgx pool, redis client, rabbit conn
    auth/         # guest JWT: issue/verify
    room/         # rooms, participants, swipes, matches
    catalog/      # restaurants, dishes (read-only на MVP)
    route/        # haversine, nearest neighbor, builder
    lead/         # publish в RabbitMQ, worker-side consumer, telegram
    httpapi/      # chi router, handlers, middleware
    ws/           # hub, client, broadcast
  migrations/     # goose, файлы 000X_*.sql
  seeds/          # dishes.json, restaurants.json
  web/            # frontend (React PWA)
  Dockerfile
  docker-compose.yml
  agent.md
```

---

## 4. Правила работы агента

1. **Одна задача = один PR = одна ветка** `feat/T<номер>-<кратко>`.
2. **Максимум 3 изменённых файла и 200 строк** за задачу. Если больше — стоп, разбей.
3. **Не трогай файлы вне scope задачи.** Если очень нужно — стоп и спроси.
4. **Каждая задача заканчивается тестом** (unit или integration) или явной
   пометкой `// no-tests: <причина>` с согласованием.
5. **Go:** `gofmt`, `go vet`, `go test ./...` должны проходить.
   Frontend: `pnpm lint` и `pnpm build` должны проходить.
6. **Коммиты:** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`).
7. **Стоп-условия** (немедленно остановись и спроси):
   - нужна новая зависимость;
   - нужна правка схемы БД сверх заявленной в задаче;
   - тест падает > 2 попыток исправить;
   - задача требует тронуть чужой репозиторий или `/opt/*`;
   - непонятно, какой файл править.
8. **Не выдумывай API.** Все эндпоинты и форматы сообщений — из раздела 6.
9. **Не пиши фронтенд «на глаз».** Сначала компонент без логики + story
   (или явная заглушка), потом интеграция.
10. **Не оптимизируй преждевременно.** Никаких кэшей, пулов, ретраев,
    circuit breaker'ов, пока задача прямо этого не просит.

---

## 5. Контракт API (не менять без согласования)

Base path: `/tasteroute/api`

```
POST /rooms                     -> {code, room_id}
GET  /rooms/{code}              -> {room_id, city, participants_count}
POST /rooms/{code}/join         -> {participant_id, token}
GET  /rooms/{code}/catalog      -> [{dish_id, name, price, tags, restaurant_id}]
GET  /rooms/{code}/route        -> {stops:[{restaurant_id,name,address,dishes}]}
POST /leads                     -> {ok}
GET  /healthz                   -> 200
```

WebSocket: `/tasteroute/api/ws?room={code}&token={jwt}`

Сообщения от клиента:
```json
{"type":"swipe","dish_id":"uuid","liked":true}
```

Сообщения от сервера:
```json
{"type":"match","dish_id":"uuid","likes":3}
{"type":"participants","count":4}
{"type":"route_ready","stops":[...]}
```

---

## 6. Задачи (атомарные, по порядку)

> Каждая задача = отдельный PR. Не начинай следующую, пока предыдущая не смержена.

### Фаза 0. Каркас

**T0.1 — Go module + skeleton**
- Scope: `go.mod`, `cmd/api/main.go`, `cmd/worker/main.go`, пустые пакеты в `internal/`.
- Acceptance: `go build ./...` зелёный, оба бинарника запускаются и печатают `hello`.
- DoD: PR смержен.

**T0.2 — config package**
- Scope: `internal/config/config.go`.
- Читает: `DB_*`, `REDIS_ADDR`, `RABBITMQ_URL`, `GUEST_JWT_SECRET`, `APP_PATH_PREFIX`.
- Acceptance: unit-тест на отсутствие `GUEST_JWT_SECRET` → ошибка.
- Max files: 1 (+1 тест).

**T0.3 — health endpoint**
- Scope: `internal/httpapi/router.go`, `handlers_health.go`.
- Acceptance: `GET /healthz` → `200 {"ok":true}`.
- Max files: 2.

**T0.4 — Dockerfile + compose skeleton**
- Scope: `Dockerfile`, `docker-compose.yml` (2 сервиса: api, worker).
- Acceptance: `docker compose build` собирается.
- Без labels Traefik — они в T7.3.

### Фаза 1. Данные

**T1.1 — миграция rooms/participants**
- Scope: `migrations/0001_rooms_participants.sql`.
- Acceptance: `goose up` / `goose down` чистые.

**T1.2 — миграция catalog**
- Scope: `migrations/0002_restaurants_dishes.sql`.
- Acceptance: `goose up/down` чистые.

**T1.3 — миграция swipes/matches/routes/leads**
- Scope: `migrations/0003_interactions.sql`.
- Acceptance: `goose up/down` чистые.

**T1.4 — seeds 20 ресторанов**
- Scope: `seeds/restaurants.json`, `seeds/dishes.json`, `cmd/seed/main.go`.
- Acceptance: `./tasteroute-seed` идемпотентен (повторный запуск не плодит дубли).

**T1.5 — pgx pool + redis + rabbit в `store`**
- Scope: `internal/store/{pg.go,redis.go,rabbit.go}`.
- Acceptance: `store.New()` возвращает готовые клиенты, есть `Close()`.
- Max files: 3.

### Фаза 2. Auth и комнаты

**T2.1 — guest JWT**
- Scope: `internal/auth/jwt.go` + тест.
- Acceptance: issue/verify, срок 24ч, payload `{participant_id, room_code}`.

**T2.2 — POST /rooms**
- Scope: `internal/httpapi/handlers_rooms.go` (только create), `internal/room/create.go`.
- Acceptance: возвращает `code` (6 символов base32) и `room_id`.

**T2.3 — GET /rooms/{code}**
- Scope: `handlers_rooms.go` (get).
- Acceptance: 404 если нет, 200 с `participants_count`.

**T2.4 — POST /rooms/{code}/join**
- Scope: `handlers_rooms.go` (join), `internal/room/join.go`.
- Acceptance: выдаёт `participant_id` + JWT. Лимит 8 участников → 409.

**T2.5 — middleware auth**
- Scope: `internal/httpapi/mw_auth.go`.
- Acceptance: без валидного JWT на `/rooms/{code}/catalog` → 401.

### Фаза 3. Каталог

**T3.1 — GET /rooms/{code}/catalog**
- Scope: `handlers_catalog.go`, `internal/catalog/list.go`.
- Acceptance: возвращает блюда из 20 ресторанов, фильтр `active=true`.

### Фаза 4. WebSocket + свайпы

**T4.1 — ws hub (in-memory)**
- Scope: `internal/ws/hub.go` + тест.
- Acceptance: `Hub.Join/Leave/Broadcast` потокобезопасны, покрыты тестом с `-race`.

**T4.2 — ws endpoint**
- Scope: `internal/ws/handler.go`, `handlers_ws.go`.
- Acceptance: подключение без JWT → 401; с JWT → `participants` broadcast.

**T4.3 — обработка swipe**
- Scope: `internal/ws/swipe.go`, `internal/room/swipe.go`.
- Acceptance: запись в `swipes`, инкремент `room:{code}:likes:{dish}` в Redis,
  повторный свайп того же участника → no-op.

**T4.4 — match**
- Scope: `internal/room/match.go`.
- Acceptance: при `likes >= min(2, ceil(n/2))` создаётся `matches` и broadcast
  `{"type":"match",...}`. Тест на 3 сценария (1 участник, 2, 5).

### Фаза 5. Маршрут

**T5.1 — haversine**
- Scope: `internal/route/geo.go` + тест.
- Acceptance: тест на 2 известные точки (погрешность < 1%).

**T5.2 — nearest neighbor builder**
- Scope: `internal/route/build.go` + тест.
- Acceptance: на 3 точках порядок оптимальный по расстоянию от старта.

**T5.3 — GET /rooms/{code}/route**
- Scope: `handlers_route.go`.
- Acceptance: если матчей < 2 → 409; иначе сохранение в `routes` и ответ.

### Фаза 6. Лиды

**T6.1 — RabbitMQ publisher**
- Scope: `internal/lead/publish.go`.
- Acceptance: кладёт в `tasteroute.leads`, тело — JSON.

**T6.2 — POST /leads**
- Scope: `handlers_leads.go`.
- Acceptance: 202 + publish.

**T6.3 — worker consumer**
- Scope: `cmd/worker/main.go`, `internal/lead/consume.go`.
- Acceptance: ловит сообщение, логирует, ack; на ошибке — nack.

**T6.4 — Telegram sender**
- Scope: `internal/lead/telegram.go`.
- Acceptance: отправляет сообщение в чат из `TELEGRAM_CHAT_ID`; при ошибке — retry 3 раза.

### Фаза 7. Frontend

**T7.1 — scaffold**
- Scope: `web/` (Vite, Tailwind, shadcn, роутер, PWA-плагин).
- Acceptance: `pnpm build` зелёный, пустая главная страница.

**T7.2 — API client + guest session**
- Scope: `web/src/lib/api.ts`, `web/src/lib/session.ts`.
- Acceptance: создание комнаты и join работают с локальным API.

**T7.3 — экран создания комнаты**
- Scope: `web/src/pages/CreateRoom.tsx`.
- Acceptance: после `POST /rooms` показывает код и кнопку «Скопировать ссылку».

**T7.4 — экран входа по ссылке**
- Scope: `web/src/pages/JoinRoom.tsx`.
- Acceptance: по `/r/{code}` джойнит и ведёт на свайпы.

**T7.5 — SwipeCard**
- Scope: `web/src/components/SwipeCard.tsx` (Framer Motion).
- Acceptance: свайп влево/вправо срабатывает, отдаёт `dish_id` и `liked`.

**T7.6 — ws hook**
- Scope: `web/src/lib/useRoomSocket.ts`.
- Acceptance: получает `participants` и `match`, отдаёт в контекст.

**T7.7 — экран свайпов**
- Scope: `web/src/pages/Swipes.tsx`.
- Acceptance: колода карточек, после свайпа — следующая; на `match` — анимация.

**T7.8 — экран маршрута**
- Scope: `web/src/pages/Route.tsx`.
- Acceptance: список остановок с адресами, кнопка «Отправить лид».

**T7.9 — PWA**
- Scope: `web/manifest.webmanifest`, `vite.config.ts`.
- Acceptance: Lighthouse PWA installable, оффлайн-шелл работает.

### Фаза 8. Деплой

**T8.1 — GitLab CI backend**
- Scope: `.gitlab-ci.yml` (build + push в `registry.gpty`).
- Acceptance: пайплайн собирает образ `tasteroute-api:<ref-slug>`.

**T8.2 — GitLab CI frontend**
- Scope: `.gitlab-ci.yml` (build + push nginx-образа).
- Acceptance: образ `tasteroute-frontend:<ref-slug>` в реестре.

**T8.3 — финальный compose с Traefik**
- Scope: `docker-compose.yml` — labels, `services` network, без `ports:` наружу.
- Acceptance: `https://<host>/tasteroute` открывается, `/tasteroute/api/healthz` → 200.

**T8.4 — smoke-тест**
- Scope: `scripts/smoke.sh` (curl create → join → catalog).
- Acceptance: скрипт зелёный против задеплоенного окружения.

---

## 7. Definition of Done для каждой задачи

- [ ] Код в отдельной ветке, PR открыт с описанием «что/зачем/как проверить».
- [ ] `go test ./...` (или `pnpm test` для фронта) зелёный.
- [ ] `go vet` / `pnpm lint` зелёный.
- [ ] Нет новых зависимостей без строки в PR-описании «approved by: @<ник>».
- [ ] Нет секретов в диффе (`grep -i secret`, `grep -i password` перед пушем).
- [ ] Изменено ≤ 3 файлов и ≤ 200 строк.
- [ ] Затронуты только файлы из scope задачи.

---

## 8. Шаблон PR

```
## Что
<1–3 строки>

## Зачем
<ссылка на задачу T<номер>>

## Как проверить
<шаги>

## Риски
<если нет — «нет»>

## Чек-лист
- [ ] тесты зелёные
- [ ] нет секретов в диффе
- [ ] нет новых зависимостей (или approved by @ник)
- [ ] ≤ 3 файлов / ≤ 200 строк
```

---

## 9. Если агент застрял

Остановись, напиши в PR комментарий:

```
BLOCKED: <одна строка причины>
Что пробовал: <список>
Что нужно от человека: <конкретный вопрос>
```

**Не пытайся «додумать» требование, которое не описано в этом файле или в задаче.**
```

---

### Что важно в этом файле

- **Жёсткий список запретов** — именно он держит агента от «полезных инициатив», которые ломают архитектуру.
- **Задачи по 1–3 файла / ≤200 строк** — это тот размер, на котором OpenCode не теряет контекст и не начинает галлюцинировать.
- **Явные стоп-условия** — агент сам останавливается на «нужна новая зависимость», а не тянет её молча.
- **API-контракт зафиксирован** — иначе агент начнёт придумывать эндпоинты на каждом шаге.
- **Definition of Done + шаблон PR** — чтобы человек-ревьюер мог за 30 секунд понять, можно ли мержить.

Если хочешь, могу отдельно написать `CLAUDE.md` / `CODE-RULES.md` для людей или сгенерировать стартовый `.gitlab-ci.yml` под эти задачи.