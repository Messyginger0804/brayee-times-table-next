#!/bin/sh
# Local dev server on :3300 against the docker-compose Postgres (host port 55436).
# Loads .env.docker (DB host "db" is remapped to localhost). Never touches prod.
set -e
cd "$(dirname "$0")/.."
set -a; . ./.env.docker; set +a
export DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed 's#@db:5432#@localhost:55436#')
export NEXTAUTH_URL=http://localhost:3300
exec npx next dev -p 3300
