# Frisbee Tracker

Vue + Quasar + PocketBase app for weekly ultimate frisbee RSVP tracking.

## Features

- Passwordless-first login (email OTP), with password fallback
- League page showing active game, attendance counts, and coming player names
- Parent/guardian support for managing child RSVPs
- Admin game management (create/edit/cancel/set active)
- Admin people management (invite/add/edit/delete users, guardian links)
- Global RSVP pause toggle with custom message (for weather/cancellations/etc.)
- Weekly scheduler to create/reset Friday game data
- Light/dark theme toggle

## Tech Stack

- Frontend: Vue 3 + Quasar
- Backend: PocketBase (custom Go entrypoint + JS migrations/hooks)
- Scheduler: Node script running in cron container
- Reverse proxy: Traefik (Docker Compose)

## Quick Start (Docker)

1. Copy env file and set credentials:

```bash
cp .env.example .env
```

2. Update at minimum:

- `POCKETBASE_ADMIN_EMAIL`
- `POCKETBASE_ADMIN_PASSWORD`

3. Build and start:

```bash
docker compose build
docker compose up -d
```

4. Apply migrations (safe to run repeatedly):

```bash
docker compose exec backend pb migrate up --dir=./pb_data --migrationsDir=./pb_migrations
```

5. Open app:

- Frontend: `http://localhost:9000`
- PocketBase dashboard: `http://localhost:8090/_/`
- Traefik dashboard: `http://localhost:8080`

## Local Dev (without Docker frontend)

```bash
npm install
npm run dev
```

Frontend dev server runs via Quasar. Backend still expected at your configured PocketBase URL.

## Environment Variables

Use `.env.example` as source of truth.

### Core

- `FRONTEND_PORT` default `8080`
- `BACKEND_PORT` default `8090`
- `VITE_PB_URL` leave blank to use current origin
- `VITE_ENABLE_OTP` default `true`

### PocketBase admin/bootstrap

- `POCKETBASE_ADMIN_EMAIL`
- `POCKETBASE_ADMIN_PASSWORD`
- `POCKETBASE_DATA_DIR` default `/pb_data`

### Scheduler

- `PB_URL` default `http://backend:8090`
- `PB_ADMIN_EMAIL`
- `PB_ADMIN_PASSWORD`
- `TIMEZONE` default `America/New_York`
- `GAME_TITLE`, `GAME_LOCATION`, `GAME_TIME`
- `SETTINGS_COLLECTION` default `app_settings`
- `SETTINGS_SLUG` default `global`
- `RESET_HOUR` default `22`

## Migrations

Current migrations:

- `1772995178_collections_snapshot.js`
- `1773010200_rename_season_settings_to_pause_settings.js`

Run:

```bash
docker compose exec backend pb migrate up --dir=./pb_data --migrationsDir=./pb_migrations
```

If you change migration files and want migration history cleanup:

```bash
docker compose exec backend pb migrate history-sync --dir=./pb_data --migrationsDir=./pb_migrations
```

## Seed / Reset Dummy Data

Wipe and seed demo users/games/attendance:

```bash
npm run seed:dummy
```

Wipe only:

```bash
npm run seed:wipe
```

These scripts require reachable PocketBase and admin credentials in env.

## Useful Commands

```bash
npm run lint
npm test
npm run build
```

## Production Compose Notes

`docker-compose.prod.yml` enables TLS-oriented Traefik settings. Update domain/email values before use.

## Security Notes

- Never commit real secrets in `.env`.
- Use strong values for `POCKETBASE_ADMIN_PASSWORD`.
- Dummy seed accounts use shared test passwords and are for local/dev only.
