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
- Docker, Render Free, Supabase Free, Upstash Free, GitHub Actions.
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

## Публичная демонстрация через Serveo

Для публичного URL используется Serveo. Наружу открывается только `web` на `5173`; API и WebSocket идут через nginx на том же публичном origin.

Текущая ссылка: `https://8e4fa45ca01c2779-80-234-77-125.serveousercontent.com`.

1. Сгенерировать SSH-ключ для Serveo и добавить его в консоль:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\tasteroute_serveo" -N '""' -C tasteroute-demo
Get-Content "$env:USERPROFILE\.ssh\tasteroute_serveo.pub"
```

Публичный ключ добавить на `https://console.serveo.net/ssh/keys`. Это бесплатно и нужно для красивого стабильного поддомена. Без регистрации Serveo выдаст длинный auto-URL.

2. Указать провайдера и поддомен в `.env`:

```text
TUNNEL_PROVIDER=serveo
SERVEO_SUBDOMAIN=tasteroute-pvgus
SERVEO_SSH_PORT=443
SERVEO_SSH_KEY=
```

`SERVEO_SSH_KEY` можно не заполнять: по умолчанию берётся `%USERPROFILE%\.ssh\tasteroute_serveo`.

3. Поднять стек и загрузить демо-данные:

```powershell
docker compose up -d --build --pull=false
docker compose --profile seed run --rm --build seed
```

4. Запустить стенд и туннель:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\public-demo.ps1 -Action start
```

Скрипт сам запускает Docker Desktop, проверяет здоровье `api` и `web`, поднимает SSH-туннель Serveo на `443`, записывает URL в `.env`, обновляет `CORS_ORIGINS`/`PUBLIC_APP_URL` и пересоздаёт `api`.

5. Проверить состояние и остановить:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\public-demo.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\public-demo.ps1 -Action stop
```

6. Включить автозапуск при входе в Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1
```

Скрипт создаёт задачу `TasteRoute Demo` в Task Scheduler и отключает сон/гибернацию при питании от сети. Удалить задачу:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1 -Remove
```

7. Проверить runtime-конфиг:

```powershell
Invoke-RestMethod https://8e4fa45ca01c2779-80-234-77-125.serveousercontent.com/tasteroute/api/public/config
```

Ожидаемый ответ:

```json
{"public_app_url":"https://8e4fa45ca01c2779-80-234-77-125.serveousercontent.com"}
```

Важно:

- `PUBLIC_APP_URL` и `CORS_ORIGINS` обновляются скриптом при запуске туннеля.
- Serveo free: 3 активных туннеля, HTTPS и поддомены бесплатно; может показывать предупреждающий экран. Pro за `$6/мес` убирает экран, для демо это не обязательно.
- API-запросы и healthcheck идут с заголовком `serveo-skip-browser-warning: true`; если Serveo покажет предупреждение, API его не получит.
- Красивый `https://tasteroute-pvgus.serveo.net` заработает после добавления SSH-ключа в консоль Serveo. До этого используется длинный auto-URL; он часто сохраняется между перезапусками, но зависит от IP.
- Стенд доступен только пока включён ПК, запущен Docker и есть интернет.
- Watchdog проверяет локальный стек и публичный URL. При падении `api`/`web`/`postgres`/`redis` перезапускает нужный контейнер; при устойчивых ошибках публичного URL перезапускает Serveo.
- `node scripts/smoke.mjs` с `API_BASE=https://<serveo-host>/tasteroute/api` проходит публичный сценарий, включая WebSocket.
- ngrok с текущего IP недоступен (`ERR_NGROK_9040`); провайдер оставлен как fallback для другой сети.
- Не публикуйте наружу порты `8080`, `5432` и `6379`.

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
| `REDIS_URL` | да | Redis/Upstash DSN |
| `GUEST_JWT_SECRET` | да | подпись гостевых JWT, минимум 16 символов |
| `RESTAURANT_JWT_SECRET` | да | подпись JWT кабинета ресторана, минимум 16 символов |
| `ADMIN_TOKEN` | да | доступ к `/admin/*`, минимум 8 символов |
| `APP_ENV` | нет | `development` или `production` |
| `PORT` | нет | порт API, по умолчанию `8080` |
| `APP_PATH_PREFIX` | нет | префикс API, по умолчанию `/tasteroute/api` |
| `CORS_ORIGINS` | нет | origin веб-клиента через запятую |
| `PUBLIC_APP_URL` | нет | публичный origin для ссылок-приглашений и QR; пусто — текущий origin браузера, без `/` на конце |
| `TUNNEL_PROVIDER` | нет | `serveo`, `ngrok` или `cloudflare`, по умолчанию `serveo` |
| `SERVEO_SUBDOMAIN` | нет | поддомен Serveo без `.serveo.net` |
| `SERVEO_SSH_PORT` | нет | SSH-порт Serveo, по умолчанию `443` |
| `SERVEO_SSH_KEY` | нет | путь к SSH-ключу Serveo; по умолчанию `%USERPROFILE%\.ssh\tasteroute_serveo` |
| `NGROK_DOMAIN` | нет | статический домен ngrok без `https://` |
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
$env:API_BASE='https://tasteroute-api-grosterx.onrender.com/tasteroute/api'
$env:ADMIN_TOKEN='...'
node scripts/smoke.mjs
```

Проверка публичной ссылки после туннеля:

```powershell
Invoke-RestMethod https://<tunnel-host>/tasteroute/api/public/config
```

Затем вручную: открыть публичный URL, создать комнату, скопировать ссылку и открыть её на втором устройстве.

## Бесплатный деплой

### 1. GitHub

Создать публичный репозиторий `Grosterx/TasteRoute` и запушить `main`. CI проверит Go и frontend.

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
   - `tasteroute-api-grosterx` — Docker web service;
   - `tasteroute-web-grosterx` — static site.
3. Заполнить `DATABASE_URL` и `REDIS_URL` в API-сервисе.
4. `GUEST_JWT_SECRET`, `RESTAURANT_JWT_SECRET` и `ADMIN_TOKEN` Render сгенерирует сам.

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

- Web: `https://tasteroute-web-grosterx.onrender.com`
- API: `https://tasteroute-api-grosterx.onrender.com/tasteroute/api/healthz`
- Админка: `https://tasteroute-web-grosterx.onrender.com/admin`
- B2B-панель: `https://tasteroute-web-grosterx.onrender.com/admin/b2b`
- `ADMIN_TOKEN` смотреть в Environment API-сервиса Render.

## Ограничения бесплатного тарифа

- Render Free засыпает после простоя; первый запрос может занять до минуты.
- Supabase Free может приостанавливать проект при неактивности.
- Upstash Free имеет лимиты команд и памяти.
- Демо рассчитано на один город — Тольятти.
- Нет оплаты, доставки и интеграции с внешними картами.
- Фото задаются URL, загрузки файлов нет.
- Публичный туннель — только для демонстрации. У него нет гарантии uptime, URL может измениться, а старые ссылки перестанут работать.

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
