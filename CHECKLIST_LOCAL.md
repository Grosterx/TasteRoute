# Проверка локального запуска (2026-10-30)

## Стек
- docker compose: postgres, redis, api, web, migrate — все healthy
- API: http://localhost:8080/tasteroute/api/healthz -> {ok:true}
- Web: http://localhost:5173/ -> 200
- Admin: http://localhost:5173/admin -> 200
- manifest.webmanifest -> 200 (application/manifest+json)

## Smoke
- node scripts/smoke.mjs: smoke ok (комната, два участника, мэтчи, маршрут, лид, админка)

## Сборка
- web: pnpm build успешен, PWA сгенерирован

## Конфиг
- .env очищен от неиспользуемых UPSTASH REST переменных
- CORS_ORIGINS включает http://localhost:5173 и https://8e4fa45ca01c2779-80-234-77-125.serveousercontent.com
- ADMIN_TOKEN синхронизирован с локальным стеком

## Примечания
- Публичный туннель: Serveo, текущий URL https://8e4fa45ca01c2779-80-234-77-125.serveousercontent.com — проверять через `scripts/public-demo.ps1 -Action status`
- Для `https://tasteroute-pvgus.serveo.net` нужно добавить публичный ключ `%USERPROFILE%\.ssh\tasteroute_serveo.pub` в https://console.serveo.net/ssh/keys
- На free-тарифе Serveo возможен браузерный warning-экран; API и healthcheck идут с заголовком `serveo-skip-browser-warning`
- Render/Upstash отключены от основного сценария, Supabase оставлен про запас
