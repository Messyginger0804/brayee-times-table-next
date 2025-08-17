Braylee's Times Tables — Next.js

This is a Next.js port of the existing Vite + Express app in `../braylees_times_table`, preserving the same features:

- Login/Register with 4-digit PIN (HttpOnly cookie session)
- Memorize, Practice, and Testing modes with playful UI
- Per-user progress tracking and last-5 summaries
- Prisma/Postgres data model identical to the original

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
- `POST /api/auth/register` — { name, pin }
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

- Public assets (Braylee.jpg and GIFs) are copied under `public/`.
- Tailwind and the "Gochi Hand" Google font are configured to match the original styling.

# brayee-times-table-next
