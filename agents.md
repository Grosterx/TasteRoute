# TasteRoute — рабочий контракт проекта

Первоначальная длинная спецификация сохранена в `docs/original-spec.md`. Этот файл фиксирует актуальные решения и границы MVP.

## Что делаем

B2B-сценарий — основной:

1. Ресторан получает публичную страницу `/places/{slug}` и QR-ссылку.
2. Гость открывает меню, создаёт комнату и делится ссылкой.
3. Друзья подключаются по коду, свайпают только блюда этого ресторана.
4. Совпавшие блюда попадают в общий выбор.
5. Гость оставляет имя, телефон, размер компании и время.
6. Бронь сохраняется в Postgres и видна в кабинете ресторана.
7. Ресторан подтверждает бронь, правит меню, смотрит аналитику и скачивает QR.

Городской сценарий — вторичный для привлечения гостей:

1. Гость создаёт городскую комнату.
2. Друзья свайпают 30 блюд из 20 ресторанов города.
3. Когда есть мэтчи в двух разных ресторанах, строится маршрут из 2–3 точек на карте.
4. Гость выбирает блюдо или доверяется рулетке и оставляет одну заявку на бронь; лид виден в `/admin`.

## Актуальные решения

- Пилот бесплатный: рестораны подключаются вручную, онлайн-оплаты нет.
- Биллинг не реализуем; `plan` и `plan_status` — только поля для ручного управления.
- Админ создаёт ресторан и аккаунт вручную и передаёт временный пароль.
- Один основной аккаунт на ресторан; самостоятельная регистрация не входит в MVP.
- Email, SMS, Telegram, push и внешние CRM исключены. Уведомления — внутри кабинета.
- Дашборд ресторана обновляется polling/refetch, без WebSocket.
- Один ресторан на аккаунт; все запросы кабинета фильтруются по `restaurant_id` из JWT.
- Фото блюд и обложки задаются только URL; загрузки файлов нет.
- `rooms.mode = city | restaurant`; комната ресторана свайпает только его меню.
- В колоде городской комнаты 30 блюд: детерминированная выборка по `md5(room.id || dish.id)` с round-robin по ресторанам.
- Город гостя определяется по `GET /public/cities` и геолокации (ближайший город в радиусе 200 км) либо выбирается вручную; выбор хранится в `localStorage` (`tasteroute.city`), разрешение на геолокацию не запрашивается при загрузке.
- Главная: hero «Хватит спорить, куда пойти», две CTA — «Из конкретного места» и «Комната из всех ресторанов города», карусель из двух шагов, переключатель города. «Ресторанам» и «Админ» живут в футере.
- Страница `/places` показывает рестораны выбранного города списком или на карте.
- Для комнаты ресторана используется `/rooms/{code}/selection` и `/bookings`, маршрут не строится.
- «Блюдо вслепую»: `dishes.blind` + `dishes.blind_riddle` (до 200 символов, обязательна при флаге). Каталог комнаты и публичная страница маскируют название, фото и теги загадкой; реальное имя приходит в WS `match` (`dish_name`, `blind`) и раскрывается в selection и маршруте.
- Городской маршрут строится только при мэтчах в **двух разных ресторанах**.
- Маршрут на Leaflet + OpenStreetMap: нумерованные маркеры, блюда в попапе, линия между остановками; при ошибке тайлов показывается список точек.
- Экран маршрута — 4 шага: блюда → карта → «что едим» (выбор или рулетка) → одна бронь на всю компанию.
- Прогресс к маршруту и кнопка «Маршрут» — в закреплённой нижней панели свайпов; кнопка активна при мэтчах в двух ресторанах.
- Порог мэтча: `min(2, ceil(participants / 2))`.
- Источник истины для лайков и мэтчей — Postgres (`swipes`, `matches`). Redis используется как кэш и fail-open, его сбой не должен терять лайк.
- Просмотры ресторана дедуплицируются в Redis на сутки по `restaurant_id + source + IP`.
- Публичные и гостевые пишущие endpoint'ы защищены Redis rate limit; при недоступности Redis запросы пропускаются.
- JWT ресторана содержит `token_version`; смена пароля и сброс админом инвалидируют старые сессии. Middleware проверяет активность аккаунта и ресторана.
- Первую бронь комнаты создаёт конкретный участник; другие участники не могут перезаписать её контактные данные.
- Лиды и брони пишутся в Postgres; админка защищена `ADMIN_TOKEN` и `X-Admin-Token`.
- Демо-данные: 20 ресторанов и 100 блюд, город Тольятти.
- Никаких реальных платежей, доставки, внешних карт и чужих данных.
- Не использовать данные из `/opt/rosatom-bdc-dev-ext`, `/opt/service`, `/opt/traefik`, `registry.gpty`.

## Стек

- Backend: Go 1.23, chi, pgx, goose, JWT, bcrypt, gorilla/websocket, go-redis.
- DB: PostgreSQL 17 в Docker на VPS.
- Cache: Redis 8 в Docker на VPS.
- Frontend: Vite, React 18, TypeScript, Tailwind, React Query, framer-motion, qrcode, Leaflet, PWA.
- Runtime: Docker Compose.
- Edge: Caddy + Let's Encrypt + бесплатный `nip.io`.
- Prod: VPS Freetato (Debian 13), `https://194-226-54-219.nip.io`.
- CI: GitHub Actions.

## API

Базовый префикс: `/tasteroute/api`.

Публичные:

- `GET /healthz`
- `GET /public/config` — публичный origin для ссылок
- `GET /public/cities` — `[{name, lat, lon, restaurants}]` для выбора и автоопределения города
- `GET /public/restaurants?city=...`
- `GET /public/restaurants/{slug}` — ресторан + активное меню
- `POST /public/restaurants/{slug}/view` — `{source}`
- `POST /sales-leads` — B2B-заявка
- `POST /restaurant/login` → `{token, account, restaurant}`
- `POST /rooms` — `{city?, restaurant_slug?, source?}`
- `GET /rooms/{code}`
- `POST /rooms/{code}/join` → `{participant_id, token, name}`

Гостевой JWT:

- `GET /rooms/{code}/catalog`
- `GET /rooms/{code}/route` — 409, пока нет двух ресторанов
- `GET /rooms/{code}/selection` — только комната ресторана, иначе 409
- `POST /bookings` — `{name, phone, party_size, requested_at?, comment}`
- `POST /leads` — `{name, phone, comment}`
- `GET /ws?room=CODE&token=JWT`

Ресторанный JWT:

- `GET /restaurant/me`, `PATCH /restaurant/me`
- `POST /restaurant/change-password`
- `GET /restaurant/dishes?all=1`, `POST /restaurant/dishes`
- `PATCH /restaurant/dishes/{dishID}`, `DELETE /restaurant/dishes/{dishID}` — архив
- `GET /restaurant/bookings?status=...`
- `PATCH /restaurant/bookings/{bookingID}` — `{status}`
- `GET /restaurant/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`

Админ (`X-Admin-Token`):

- `GET /admin/leads`
- `GET /admin/restaurants`, `POST /admin/restaurants`
- `PATCH /admin/restaurants/{restaurantID}`
- `POST /admin/restaurants/{restaurantID}/account` — `{email, password}`
- `GET /admin/sales-leads`, `PATCH /admin/sales-leads/{leadID}`
- `GET /admin/bookings?restaurant_id=...`
- `GET /admin/metrics`

WS-сообщения:

- клиент → сервер: `{"type":"swipe","dish_id":"...","liked":true}`
- сервер → клиент: `participants`, `match`, `error`

## Переменные окружения

Обязательные для API:

- `DATABASE_URL`
- `REDIS_URL`
- `GUEST_JWT_SECRET` — минимум 16 символов
- `RESTAURANT_JWT_SECRET` — минимум 16 символов
- `ADMIN_TOKEN` — минимум 8 символов

Опциональные:

- `APP_ENV` — по умолчанию `development`
- `PORT` — по умолчанию `8080`
- `APP_PATH_PREFIX` — по умолчанию `/tasteroute/api`
- `CORS_ORIGINS` — через запятую
- `PUBLIC_APP_URL` — публичный origin для ссылок-приглашений
- `TUNNEL_PROVIDER` — legacy, локальный туннель: `serveo`, `ngrok` или `cloudflare`
- `SERVEO_SUBDOMAIN` — legacy, поддомен Serveo без `.serveo.net`
- `SERVEO_SSH_PORT` — legacy, SSH-порт Serveo, по умолчанию `443`
- `SERVEO_SSH_KEY` — legacy, путь к SSH-ключу Serveo
- `NGROK_DOMAIN` — legacy, статический домен ngrok без `https://`
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
docker compose --profile seed run --rm --build seed
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

## Прод и эксплуатация

- Прод: VPS Freetato (Debian 13), код в `/opt/tasteroute`, стек в Docker Compose, TLS и прокси — Caddy, домен — `nip.io`.
- Ссылка: `https://194-226-54-219.nip.io`. Админка `/admin`, B2B `/admin/b2b`, кабинет `/restaurant/login`.
- `nip.io` резолвит и вариант с точками (`194.226.54.219.nip.io`); Caddy держит сертификаты на оба имени и редиректит точечный вариант на канон с дефисами.
- Наружу открыты только `22`, `80`, `443`; `api` и `web` слушают `127.0.0.1`.
- `APP_ENV=production` включает HSTS. `CORS_ORIGINS` и `PUBLIC_APP_URL` указывают на публичный origin.
- Секреты только в `/opt/tasteroute/.env` (`chmod 600`), в git не попадают.
- Обновление: `cd /opt/tasteroute && git pull && docker compose up -d --build`. Миграции применяет сервис `migrate`.
- Бэкапы: `/usr/local/bin/tasteroute-backup.sh` по cron в `03:30`, дампы в `/var/backups/tasteroute` за 7 дней; `scripts/pull-backup.ps1` копирует свежий дамп на ПК.
- Надёжность: `restart: unless-stopped`, автозапуск Docker/Caddy, watchdog `/usr/local/bin/tasteroute-watchdog.sh` каждые 5 минут (лог `/var/log/tasteroute-watchdog.log`), `unattended-upgrades`.
- SSH только по ключу. Провайдерский `00-freetato.conf` включает пароль, поэтому локальный drop-in `00-00-hardening.conf` должен читаться раньше: sshd берёт первое значение.
- При неоплате VPS останавливается и через 14 дней удаляется вместе с бэкапами; актуальная база должна быть в дампе на ПК.

## Правила работы

- Секреты не коммитить; `.env` в `.gitignore`.
- Реальный `CP_OS_PASS`, засветившийся в чате, не использовать и ротировать.
- Не добавлять Telegram, RabbitMQ, worker, CloudAMQP, email/SMS и биллинг без нового решения пользователя.
- Не ломать прод-сценарий на VPS и бесплатный локальный запуск.
- После изменений backend: `gofmt`, `go test ./...`, `go vet ./...`.
- После изменений frontend: `pnpm lint`, `pnpm build`.
- Для проверки API/WS использовать `scripts/smoke.mjs`.
- При изменении продукта обновлять этот файл и README.

## Definition of done

- `docker compose up -d --build` поднимает web, api, postgres, redis.
- `node scripts/smoke.mjs` проходит городской сценарий и B2B: публичная страница, создание ресторана и аккаунта, комната ресторана, мэтч, бронь, кабинет, аналитика, продажа лида, админка.
- `pnpm build` собирает PWA.
- Прод открывается по `https://194-226-54-219.nip.io`, `healthz` отвечает `{"ok":true}`.
- README позволяет повторить запуск и деплой с нуля.
