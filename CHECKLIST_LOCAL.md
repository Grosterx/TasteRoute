# Проверка локального запуска (2026-10-23)

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
- CORS_ORIGINS включает http://localhost:5173 и https://69fd9872ed793e.lhr.life
- ADMIN_TOKEN синхронизирован с локальным стеком

## Примечания
- Туннель localhost.run/69fd9872ed793e.lhr.life сейчас недоступен (502) — поднять при необходимости
- Render/Upstash отключены от основного сценария, Supabase оставлен про запас
