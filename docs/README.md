# Documentation index

Start with the [project README](../README.md) for what the app is and how to run it.

| Page | One line |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Prerequisites, env files, local database, migrations, seeding, conventions, and how to add routes, modes and skills |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview: request flow, auth, guest seats, saved cadets, and module layout |
| [API.md](API.md) | Every HTTP endpoint with request and response shapes |
| [DATA-MODEL.md](DATA-MODEL.md) | Prisma models, relationships and migration history |
| [GAMEPLAY.md](GAMEPLAY.md) | Game modes, level and mastery rules, unlocking, spelling |
| [OPERATIONS.md](OPERATIONS.md) | Production operations: env vars, cron, backups, prod migrations |
| [TESTING.md](TESTING.md) | How tests are organized, how to run them, and how to write new ones |
| [KNOWN-ISSUES.md](KNOWN-ISSUES.md) | Open problems and accepted limitations |
| [DEPLOY-RUNBOOK.md](DEPLOY-RUNBOOK.md) | Step-by-step production migration and deploy procedure |
| [curriculum/math.md](curriculum/math.md) | Math curriculum research by grade (TEKS and Common Core) |
| [curriculum/math.json](curriculum/math.json) | Machine-readable math spec; `lib/curriculum/math/spec.json` is an identical copy |
| [curriculum/spelling.md](curriculum/spelling.md) | Spelling curriculum research |
| [curriculum/spelling.json](curriculum/spelling.json) | Machine-readable spelling word list, loaded by `npm run db:import-spelling` |
| [../lib/curriculum/README.md](../lib/curriculum/README.md) | API of the math problem library (generate, check, mastery) |
| [../env.example](../env.example) | Every environment variable the code reads |
