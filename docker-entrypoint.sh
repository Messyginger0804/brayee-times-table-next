#!/bin/sh
set -e
# Apply checked-in migrations (never `db push`). The seed is idempotent and never overwrites existing users.
npx prisma migrate deploy
npx prisma db seed
exec npm start
