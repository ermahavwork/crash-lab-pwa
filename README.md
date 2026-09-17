# Crash Lab — учебное PWA (crash-игра, iGaming-демо)

Progressive Web App без бэкенда: устанавливается на Android (Chrome → «Установить приложение»),
показывает иконку на рабочем столе, работает офлайн, 5 экранов. Никаких реальных денег —
только виртуальные кредиты в `localStorage`.

**Живая версия:** https://newvps.tailff4a53.ts.net/pwa/

## Экраны

| # | Маршрут | Что делает |
|---|---------|------------|
| 1 | `#/` Лобби | баланс, кнопка «Установить» (beforeinstallprompt), ежедневный бонус, сводка, последние крашы |
| 2 | `#/crash` Игра | canvas-график множителя, ставка / авто-вывод / кэшаут, вибрация, лента крашей |
| 3 | `#/history` История | профит, лучший вывод, все раунды; тап по раунду → проверка честности |
| 4 | `#/fair` Честность | provably-fair: commit = sha256(serverSeed), HMAC(serverSeed, clientSeed) → точка краша |
| 5 | `#/wallet` Профиль | демо-пополнение, сброс, ник, client seed, звук/вибрация, статус PWA, экспорт JSON |

## Стек и что взято из чужого кода

| Компонент | Источник | Лицензия | Как используется |
|-----------|----------|----------|------------------|
| [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) ★4.2k | vite-pwa | MIT | манифест, service worker (Workbox precache, autoUpdate), `virtual:pwa-register` |
| [@vite-pwa/assets-generator](https://github.com/vite-pwa/assets-generator) | vite-pwa | MIT | весь набор иконок (64/192/512, maskable, apple-touch, favicon) из одного `public/logo.svg` |
| [Workbox](https://github.com/GoogleChrome/workbox) | Google | MIT | runtime service worker |
| Provably-fair схема | bustabit (открытый стандарт crash-игр) | — | `src/fair.ts`: HMAC-SHA256, первые 52 бита, `h % 33 == 0 → 1.00x`, `⌊(100·2⁵²−h)/(2⁵²−h)⌋/100`; кривая роста `m(t)=⌊100·e^(0.00006·t)⌋/100` |
| [aviator-betting-game-clone](https://github.com/ozgeonec/aviator-betting-game-clone) ★34 | ozgeonec | MIT | идея canvas-«хвоста» кривой и цветовая градация чипов (<2x / 2–10x / ≥10x) в `src/screens/crash.ts`, `src/ui.ts` |

Vite 8 + TypeScript, без фреймворка: hash-роутер и экраны — свои (`src/main.ts`, `src/screens/*`).

## Сборка

```bash
pnpm install
pnpm icons        # регенерация иконок из public/logo.svg (нужно только после смены логотипа)
pnpm build        # tsc + vite build → dist/  (base = /pwa/; для корня: VITE_BASE=/ pnpm build)
pnpm dev          # локальная разработка
```

## Хостинг (как на сервере)

`serve.py` — статический сервер `dist/` на `127.0.0.1:8180`, срезает префикс `/pwa`, отдаёт правильный MIME
для `manifest.webmanifest`, `Service-Worker-Allowed`, `no-cache` на `sw.js`/`index.html`, год кеша на `assets/`.
systemd user-юнит `crashpwa.service`; наружу — Tailscale Funnel:

```bash
tailscale funnel --bg --yes --set-path=/pwa http://127.0.0.1:8180
```

PWA требует HTTPS — Funnel даёт его сам (Let's Encrypt через `*.ts.net`).

## Установка на Android

1. Открыть ссылку в Chrome.
2. Нажать «Установить» в лобби (если Chrome отдал `beforeinstallprompt`) или меню ⋮ → «Установить приложение».
3. Иконка «Crash Lab» появляется на рабочем столе; запуск — в standalone (без адресной строки).

## Проверка честности раунда вручную

```
hash  = HMAC-SHA256(key = serverSeed, msg = clientSeed)
h     = int(hash[:13], 16)          # 52 бита
crash = 1.00 if h % 33 == 0 else floor((100 * 2**52 - h) / (2**52 - h)) / 100
```
Commit `sha256(serverSeed)` показывается на экране игры до старта раунда.
