# TasteRoute

B2B-платформа для ресторанов: QR-меню, групповой выбор блюд и брони. Плюс вторичный городской гастротур со свайпами и маршрутом.

**Проблема.** QR-меню показывает блюда, но не помогает компании договориться и не доводит гостя до брони. Группа спорит в чате, ресторан не получает контакт, а QR-трафик остаётся анонимным.

**Решение.** TasteRoute превращает QR-меню в сценарий: гости вместе выбирают блюда, видят совпадения, оставляют бронь, а ресторан получает заявку, меню, QR и аналитику в одном кабинете.

## Что умеет

Ресторан:

- Публичная страница `/places/{slug}` с меню и кнопкой «Собрать компанию».
- QR-ссылка на страницу ресторана и скачивание PNG в кабинете.
- Гостевая комната, которая свайпает только меню этого ресторана.
- Общий выбор: блюда, которые лайкнули несколько участников.
- Бронь с именем, телефоном, размером компании, временем и комментарием.
- Кабинет: профиль, меню, брони, аналитика, QR, смена пароля.
- «Хит недели» на главной кабинета: блюдо с лучшими мэтчами за последние 7 дней.
- «Блюдо вслепую»: ресторан прячет название и фото за загадкой, имя раскрывается при мэтче.
- Брони и аналитика обновляются polling/refetch, без WebSocket в кабинете.

Администратор:

- `/admin/b2b`: создание ресторана и аккаунта, управление тарифом/статусом, B2B-заявки, брони и метрики.
- `/admin`: гостевые лиды городских маршрутов.
- Защита через `ADMIN_TOKEN` и заголовок `X-Admin-Token`.

Гости:

- Городская комната: 20 ресторанов и 100 блюд Тольятти.
- Свайпы через WebSocket; лайки и мэтчи хранятся в PostgreSQL, Redis используется как кэш.
- Мэтч по формуле `min(2, ceil(participants / 2))`.
- Праздничный оверлей мэтча с конфетти и вибрацией.
- Городской маршрут только при совпадениях в двух разных ресторанах.
- Рулетка мэтчей в общем выборе и на маршруте: колесо выбирает одно блюдо из совпавших.
- Лид сохраняется в PostgreSQL.

Пилот бесплатный. Онлайн-оплаты, email, SMS, Telegram, push, доставки и внешних CRM нет.

## Гастро-фишки

Страница `/fun` — витрина лёгких забав для разогрева аппетита и шеринга:

- «Какая ты шаурма» — тест из шести вопросов с персональным вердиктом и ссылкой-результатом.
- «Булочный гороскоп» — предсказание на день по дате рождения.
- «Расклад на вечер» — гастро-таро: три карты (аперитив, основное, десерт). Расклад детерминирован на день, ссылкой можно поделиться.
- «Гастро-совместимость пары» — тест на двоих с передачей телефона: процент совпадения вкусов, вердикт и ссылка на результат.
- OG- и Twitter-разметка: ссылки на приложение в мессенджерах показывают карточку TasteRoute.

«Блюдо вслепую» для ресторанов: в кабинете блюдо помечается флагом и загадкой (до 200 символов). В каталоге комнаты и на публичной странице гости видят загадку вместо названия, фото и тегов; карточка помечена бейджем «Секрет». Настоящее название приходит в WS-сообщении о мэтче и показывается с бейджем «Секретное блюдо раскрыто», а также в общем выборе и маршруте. В демо-данных четыре секретных блюда.

## Как устроено

- `web` — React PWA. Публичные страницы ресторанов, гостевые комнаты, кабинет ресторана и админка.
- `api` — Go-сервер: REST, гостевые и ресторанные JWT, WebSocket-хаб, брони, лиды и аналитика.
- `postgres` — источник истины: комнаты, свайпы, мэтчи, брони, лиды, рестораны, аккаунты и меню.
- `redis` — кэш мэтчей, rate limit и дедупликация просмотров. Сбой Redis не теряет лайк и не блокирует запросы.
- nginx внутри контейнера `web` проксирует `/tasteroute/api/` и WebSocket в `api`, поэтому браузер работает с одним origin.
- Для запуска снаружи достаточно открыть только `web`; API, PostgreSQL и Redis не публикуются в интернет.
- Ссылки-приглашения и QR строятся от `PUBLIC_APP_URL`. Если переменная пуста, используется текущий origin браузера.
- Frontend получает публичный origin через `GET /public/config` при старте. Поэтому смена туннеля не требует пересборки `web`.

Основной путь гостя в ресторане:

1. Гость открывает `/places/{slug}` или сканирует QR.
2. Создаёт комнату и отправляет друзьям ссылку `/r/{code}`.
3. Участники свайпают только меню этого ресторана.
4. Совпавшие блюда попадают в общий выбор.
5. Один из участников оставляет имя, телефон, размер компании и время.
6. Бронь появляется в кабинете ресторана.

Городская комната работает так же, но свайпает блюда 20 ресторанов. Маршрут строится только при мэтчах в двух разных ресторанах.

## Надёжность и безопасность

- Лайк записывается в Postgres до расчёта мэтча. Сбой Redis не теряет лайк; повторный свайп восстанавливает мэтч.
- JWT ресторана содержит `token_version`. Смена пароля или сброс админом завершает старые сессии; кабинет автоматически разлогинивает при 401.
- Middleware кабинета проверяет активность аккаунта и ресторана на каждом запросе.
- Публичные и гостевые пишущие endpoint'ы ограничены по IP через Redis. При недоступности Redis лимиты не блокируют работу.
- Просмотры ресторана дедуплицируются на сутки по ресторану, источнику и IP.
- Первую бронь комнаты создаёт конкретный участник. Другие участники не могут перезаписать её имя и телефон.

## Стек

- Go 1.23, chi, pgx, goose, JWT, bcrypt, gorilla/websocket, go-redis.
- PostgreSQL и Redis.
- React 18, Vite, TypeScript, Tailwind, React Query, framer-motion, qrcode.
- Docker, VPS (Debian + Caddy + `nip.io`), GitHub Actions.
- PWA-манифест и service worker.

## Быстрый старт в Docker

Нужны Docker Desktop и свободные порты `5173`, `8080`, `5432`, `6379`.

```powershell
docker compose up -d --build
docker compose --profile seed run --rm --build seed
```

Открыть:

- Web: http://localhost:5173
- Рестораны: http://localhost:5173/places
- Для ресторанов: http://localhost:5173/for-restaurants
- Кабинет: http://localhost:5173/restaurant/login
- Админка гостей: http://localhost:5173/admin
- B2B-панель: http://localhost:5173/admin/b2b
- API health: http://localhost:8080/tasteroute/api/healthz

Локальный `ADMIN_TOKEN` по умолчанию — `admin-local-demo-123456`, если он не переопределён в `.env`.

`migrate` запускается автоматически при старте API. Seed выполняется отдельной командой. Если в корне есть `.env`, Docker Compose использует из него `GUEST_JWT_SECRET`, `RESTAURANT_JWT_SECRET`, `ADMIN_TOKEN`, `CORS_ORIGINS` и `PUBLIC_APP_URL`.

Проверка полного сценария:

```powershell
node scripts/smoke.mjs
```

Smoke-тест проходит городскую комнату и B2B: публичная страница, создание ресторана и аккаунта, комната ресторана, мэтч, бронь, кабинет, аналитика, B2B-лид и админка. Дополнительно проверяются запрет перезаписи чужой брони (409) и инвалидация старого JWT после смены пароля. Временный ресторан после проверки скрывается (`active=false`).

## Локальная демонстрация (опционально)

Прод работает на VPS — см. «Деплой на VPS». Туннели Serveo/ngrok/cloudflared остались только как локальный fallback: они зависят от включённого ПК, Docker и интернета, а при обрыве туннеля публичная ссылка отдаёт 502.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\public-demo.ps1 -Action start
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\public-demo.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\public-demo.ps1 -Action stop
```

Скрипт проверяет здоровье `api`/`web`, поднимает SSH-туннель, записывает URL в `.env` и обновляет `CORS_ORIGINS`/`PUBLIC_APP_URL`. Автозапуск при входе в Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1 -Remove
```

Переменные `TUNNEL_PROVIDER`, `SERVEO_*` и `NGROK_DOMAIN` — в таблице окружения. Для прода они не нужны.

### Как подключить ресторан вручную

1. Открыть `/admin/b2b` и ввести `ADMIN_TOKEN`.
2. Во вкладке «Рестораны» создать ресторан: название, slug, город, кухня, адрес, телефон.
3. В карточке ресторана создать аккаунт: email и пароль не короче 8 символов.
4. Передать ресторану email, временный пароль и ссылку `/restaurant/login`.
5. Ресторан заполняет профиль, добавляет блюда и скачивает QR.

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
$env:RESTAURANT_JWT_SECRET='dev-only-restaurant-secret-0123456789'
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
| `REDIS_URL` | да | Redis DSN; в Docker — `redis://redis:6379/0` |
| `GUEST_JWT_SECRET` | да | подпись гостевых JWT, минимум 16 символов |
| `RESTAURANT_JWT_SECRET` | да | подпись JWT кабинета ресторана, минимум 16 символов |
| `ADMIN_TOKEN` | да | доступ к `/admin/*`, минимум 8 символов |
| `APP_ENV` | нет | `development` или `production` |
| `PORT` | нет | порт API, по умолчанию `8080` |
| `APP_PATH_PREFIX` | нет | префикс API, по умолчанию `/tasteroute/api` |
| `CORS_ORIGINS` | нет | origin веб-клиента через запятую |
| `PUBLIC_APP_URL` | нет | публичный origin для ссылок-приглашений и QR; пусто — текущий origin браузера, без `/` на конце |
| `TUNNEL_PROVIDER` | нет | legacy: `serveo`, `ngrok` или `cloudflare` для локального туннеля |
| `SERVEO_SUBDOMAIN` | нет | legacy: поддомен Serveo без `.serveo.net` |
| `SERVEO_SSH_PORT` | нет | legacy: SSH-порт Serveo, по умолчанию `443` |
| `SERVEO_SSH_KEY` | нет | legacy: путь к SSH-ключу Serveo |
| `NGROK_DOMAIN` | нет | legacy: статический домен ngrok без `https://` |
| `SEEDS_DIR` | нет | каталог seed-файлов, по умолчанию `seeds` |
| `VITE_API_BASE_URL` | нет | база API на frontend, по умолчанию `/tasteroute/api` |

## API

Базовый путь: `/tasteroute/api`.

Публичные:

| Метод | Путь | Доступ |
| --- | --- | --- |
| `GET` | `/healthz` | без авторизации |
| `GET` | `/public/config` | без авторизации |
| `GET` | `/public/restaurants?city=...` | без авторизации |
| `GET` | `/public/restaurants/{slug}` | без авторизации |
| `POST` | `/public/restaurants/{slug}/view` | без авторизации |
| `POST` | `/sales-leads` | без авторизации |
| `POST` | `/restaurant/login` | без авторизации |
| `POST` | `/rooms` | без авторизации |
| `GET` | `/rooms/{code}` | без авторизации |
| `POST` | `/rooms/{code}/join` | без авторизации |
| `GET` | `/ws?room=CODE&token=JWT` | WebSocket |

`GET /public/config` возвращает `{public_app_url}` — публичный origin, который frontend использует для ссылок-приглашений и QR. Endpoint не требует авторизации.

Гостевой JWT:

| Метод | Путь |
| --- | --- |
| `GET` | `/rooms/{code}/catalog` |
| `GET` | `/rooms/{code}/route` |
| `GET` | `/rooms/{code}/selection` |
| `POST` | `/bookings` |
| `POST` | `/leads` |

Ресторанный JWT:

| Метод | Путь |
| --- | --- |
| `GET`, `PATCH` | `/restaurant/me` |
| `POST` | `/restaurant/change-password` |
| `GET`, `POST` | `/restaurant/dishes` |
| `PATCH`, `DELETE` | `/restaurant/dishes/{dishID}` |
| `GET` | `/restaurant/bookings?status=...` |
| `PATCH` | `/restaurant/bookings/{bookingID}` |
| `GET` | `/restaurant/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` |

Админ (`X-Admin-Token`):

| Метод | Путь |
| --- | --- |
| `GET` | `/admin/leads` |
| `GET`, `POST` | `/admin/restaurants` |
| `PATCH` | `/admin/restaurants/{restaurantID}` |
| `POST` | `/admin/restaurants/{restaurantID}/account` |
| `GET` | `/admin/sales-leads` |
| `PATCH` | `/admin/sales-leads/{leadID}` |
| `GET` | `/admin/bookings?restaurant_id=...` |
| `GET` | `/admin/metrics` |

Комната ресторана: `/rooms` с `{restaurant_slug, source}`. В такой комнате каталог уже отфильтрован по ресторану, `/route` возвращает 409, а выбор и бронь доступны через `/selection` и `/bookings`.

WebSocket:

```json
{"type":"swipe","dish_id":"...","liked":true}
```

Сервер присылает `participants`, `match` и `error`. Сообщение о мэтче содержит название блюда и флаг секрета:

```json
{"type":"match","dish_id":"...","dish_name":"Пельмени с олениной","blind":true,"likes":2}
```

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

Smoke-тест:

```powershell
node scripts/smoke.mjs
```

Для удалённого API:

```powershell
$env:API_BASE='https://194-226-54-219.nip.io/tasteroute/api'
$env:ADMIN_TOKEN='...'
node scripts/smoke.mjs
```

Проверка публичной ссылки:

```powershell
Invoke-RestMethod https://194-226-54-219.nip.io/tasteroute/api/public/config
```

Затем вручную: открыть публичный URL, создать комнату, скопировать ссылку и открыть её на втором устройстве.

## Деплой на VPS

Прод крутится на VPS Freetato (Debian 13, 2 ГБ RAM, 30 ГБ SSD): Docker Compose + Caddy + бесплатный домен `nip.io`. Render, Supabase и Upstash в продовом пути не используются.

Рабочая ссылка: `https://194-226-54-219.nip.io`.

### 1. Подготовка сервера

```bash
apt-get update && apt-get -y upgrade
apt-get install -y curl git ufw ca-certificates caddy
timedatectl set-timezone Europe/Moscow
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
curl -fsSL https://get.docker.com | sh
```

Наружу открыты только `22`, `80` и `443`.

### 2. Код и `.env`

```bash
git clone https://github.com/Grosterx/TasteRoute.git /opt/tasteroute
cd /opt/tasteroute
umask 077
cat > .env <<EOF
APP_ENV=production
GUEST_JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
RESTAURANT_JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ADMIN_TOKEN=$(openssl rand -hex 24)
CORS_ORIGINS=https://194-226-54-219.nip.io
PUBLIC_APP_URL=https://194-226-54-219.nip.io
EOF
chmod 600 .env
```

`nip.io` — бесплатный DNS: адрес `194.226.54.219` превращается в `194-226-54-219.nip.io`. Регистрация и паспорт не нужны, Let's Encrypt выдаёт сертификат на этот домен.

### 3. Запуск

```bash
docker compose up -d --build
docker compose --profile seed run --rm seed
```

`migrate` применяет миграции при старте `api`, seed загружает 20 ресторанов и 100 блюд Тольятти. `api` и `web` слушают только `127.0.0.1`, поэтому единственная точка входа — Caddy.

### 4. Caddy и HTTPS

`/etc/caddy/Caddyfile`:

```caddyfile
194-226-54-219.nip.io {
	encode zstd gzip
	reverse_proxy 127.0.0.1:5173
}
```

```bash
systemctl enable --now caddy
systemctl reload caddy
```

Caddy сам получает и продлевает сертификат Let's Encrypt. `web/nginx.conf` пробрасывает `X-Forwarded-For`, поэтому rate limit и дедупликация просмотров видят реальный IP гостя.

### 5. Проверка

```bash
curl -fsS https://194-226-54-219.nip.io/tasteroute/api/healthz
curl -fsS https://194-226-54-219.nip.io/tasteroute/api/public/config
```

Ожидается `{"ok":true}` и `{"public_app_url":"https://194-226-54-219.nip.io"}`.

Полный сценарий против прода с Windows:

```powershell
$env:API_BASE='https://194-226-54-219.nip.io/tasteroute/api'
$env:ADMIN_TOKEN='...'   # значение из /opt/tasteroute/.env
node scripts/smoke.mjs
```

### 6. Обновление

```bash
cd /opt/tasteroute
git pull
docker compose up -d --build
```

Миграции применяются автоматически сервисом `migrate`. Если менялись зависимости frontend, `--build` пересоберёт образ `web`.

### 7. Бэкапы

Ежедневный дамп в `03:30` и недельная очистка образов описаны в `/etc/cron.d/tasteroute`, скрипт — `/usr/local/bin/tasteroute-backup.sh`:

```bash
docker compose exec -T postgres pg_dump -U tasteroute tasteroute | gzip > /var/backups/tasteroute/db-$(date +%F).sql.gz
```

Дампы хранятся 7 дней. Скопировать свежий дамп на ПК:

```powershell
.\scripts\pull-backup.ps1
```

Восстановление на новом сервере:

```bash
gunzip -c db-2026-11-11.sql.gz | docker compose exec -T postgres psql -U tasteroute -d tasteroute
```

### 8. SSH

Вход только по ключу: `PermitRootLogin prohibit-password`, `PasswordAuthentication no`. Провайдер кладёт `/etc/ssh/sshd_config.d/00-freetato.conf` с `yes`, а sshd берёт первое встреченное значение, поэтому локальный drop-in назван так, чтобы читаться раньше: `/etc/ssh/sshd_config.d/00-00-hardening.conf`.

```bash
ssh -i ~/.ssh/tasteroute_vps root@194.226.54.219
```

Ротация секретов: поменять значение в `/opt/tasteroute/.env` и выполнить `docker compose up -d api`. Смена `RESTAURANT_JWT_SECRET` разлогинивает кабинеты, `ADMIN_TOKEN` — админку.

## Ограничения и эксплуатация

- VPS Freetato: при неоплате VM останавливается, через 14 дней удаляется вместе с диском и бэкапами. Код в GitHub, база — в дампе на ПК.
- `nip.io` зависит от доступности их DNS и Let's Encrypt; при смене IP меняется и адрес.
- Демо рассчитано на один город — Тольятти.
- Нет оплаты, доставки и интеграции с внешними картами.
- Фото задаются URL, загрузки файлов нет.
- `8080`, `5432` и `6379` наружу не публикуются.

## Структура

```text
cmd/
  api/        HTTP + WebSocket сервер
  migrate/    goose-миграции
  seed/       загрузка ресторанов и блюд
internal/
  analytics/  метрики платформы и ресторана
  auth/       гостевые и ресторанные JWT
  booking/    брони
  catalog/    каталог блюд
  config/     env
  httpapi/    HTTP-хендлеры, CORS, авторизация
  lead/       городские лиды
  restaurant/ рестораны, аккаунты, меню
  room/       комнаты, свайпы, мэтчи
  route/      городской маршрут
  sales/      B2B-заявки
  selection/  совпавшие блюда комнаты ресторана
  store/      Postgres + Redis
  ws/         WebSocket hub
migrations/   SQL-схема
seeds/        демо-данные
web/          React PWA
scripts/      smoke-тест
```
