Braylee's Space Academy — Next.js

Math & spelling missions for space cadets.

This is a Next.js port of the existing Vite + Express app in `../braylees_times_table`, preserving the same features:

- Braylee logs in with a 4-digit PIN; everyone else plays as an anonymous guest seat (no sign-ups). A guest can tap "Save my cadet" to keep their progress under a nickname + 5-digit student ID and sign in later ("Are you a saved cadet? Sign in")
- Memorize, Practice, and Testing modes with playful UI
- Per-user progress tracking and last-5 summaries
- Prisma/Postgres data model identical to the original

Local development (local only; never point at prod)

- Postgres + prod-build app: `docker compose up -d --build` (db on localhost:55436, app on http://localhost:3200; both `restart: unless-stopped`). Stop: `docker compose down` (add `-v` ONLY to wipe the DB volume).
- Dev server: `nohup npm run dev:local > /tmp/dev3300.log 2>&1 &` -> http://localhost:3300 (loads `.env.docker`, DB at localhost:55436). Stop: `pkill -f "[n]ext dev -p 3300"`. Needs the `db` container up.
- Config is `.env.docker` (gitignored; `env.example` lists the keys). `GUEST_SEATS` (default 5) sets the number of guest seats; `CRON_SECRET` guards `/api/cron/purge-guests` (`curl -H "Authorization: Bearer $CRON_SECRET" localhost:3300/api/cron/purge-guests`; 401 without it).
- Logins: "Play as Guest" (cookie-based seat, wiped after 7 idle days) or "Are you a saved cadet? Sign in" with a name + secret number (Braylee uses it too; her PIN is in `prisma/seed-users.js`).
- Saved cadets: `SAVED_CADETS_MAX` (default 10, Braylee not counted) and `SAVED_CADET_RETENTION_DAYS` (default 30 idle days, then the cadet and all their data are deleted; lazily and in the daily cron; Braylee never). The student ID is bcrypt-hashed into `User.pin` and never logged, returned or stored in plaintext. `npm run db:cleanup-accounts` refuses to run while saved cadets exist unless you pass `--include-saved-cadets` (then they are deleted too). `/gifs` is dev-only (404 on :3200).
- Reset the local DB from the prod dump (`.backups/prod.dump`, real users' data: never commit or share). The dump is pg 18 format, so restore with a postgres:18 client:

      docker compose up -d db
      docker exec braylee-times-table-next-db-1 psql -U braylee -d postgres -c 'drop database braylee with (force)' -c 'create database braylee'   # container name may differ: `docker compose ps`
      docker run --rm --network host -v "$PWD/.backups:/d:ro" -e PGPASSWORD=braylee_local postgres:18 pg_restore --no-owner --no-privileges -h localhost -p 55436 -U braylee -d braylee /d/prod.dump
      export DATABASE_URL=postgresql://braylee:braylee_local@localhost:55436/braylee
      npx prisma migrate resolve --applied 20260301000000_baseline_prod_schema
      npm run db:migrate
      npm run db:cleanup-accounts            # dry run; add -- --confirm to write

- Tests: `npm test` (vitest), `npm run lint`, `npx tsc --noEmit`.
- Deploying: see `docs/DEPLOY-RUNBOOK.md`.

Getting Started

1) Install dependencies

   npm install

2) Configure database

   Create a `.env` file with a Postgres URL:

   DATABASE_URL=postgresql://user:pass@localhost:5432/braylee_times_table

3) Generate client and run migrations

   npx prisma generate
   npx prisma migrate dev --name init

4) Seed data (optional but recommended)

   node prisma/seed.js
   node prisma/seed-users.js

5) Run the app

   npm run dev

API Overview

- `POST /api/auth/login` — { name, pin }
- `POST /api/guest/claim` — { mode: 'resume' | 'new' }; `GET /api/guest/status`; `POST /api/cadets/save` — { name, secret, confirm } (guest only; answers { ok, name }); `PUT /api/me/grade` — { grade }
- `GET /api/auth/me` — current user
- `POST /api/auth/logout`
- `POST /api/users/level` — { level }
- `GET /api/problems` — auto-seeds 12x12 if empty
- `GET /api/problems/count`
- `POST /api/problems/:id/attempt` — { correct }
- `GET /api/problems/:id/last5`
- `POST /api/problems/:id/mastered`
- `GET /api/attempts/last5`
- `GET /api/progress/summary`
- `GET /api/progress/level/:level/status`
- `POST /api/test/score`, `GET /api/test/best`

Notes

- Public assets (Braylee's cutout in `public/braylee/` and GIFs) are copied under `public/`.
- Tailwind and the "Gochi Hand" Google font are configured to match the original styling.

# brayee-times-table-next
