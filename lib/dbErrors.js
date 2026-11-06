import { NextResponse } from 'next/server';

export const MAINTENANCE_MESSAGE = 'The game is getting an upgrade! Please try again in a few minutes. 🛠️';

/**
 * True when the database is missing a table/column the code expects, i.e. the code was deployed before
 * `prisma migrate deploy` ran. Prisma reports P2022 (column) / P2021 (table) for model queries, and P2010 with
 * the Postgres code 42703 / 42P01 for raw queries.
 */
export function isSchemaMissing(e) {
  const code = e?.code;
  if (code === 'P2022' || code === 'P2021') return true;
  if (code === 'P2010') {
    const pg = String(e?.meta?.code || e?.meta?.message || e?.message || '');
    return /42703|42P01|does not exist/.test(pg);
  }
  return false;
}

/** Friendly 503 for API routes. */
export function maintenanceResponse() {
  return NextResponse.json({ error: MAINTENANCE_MESSAGE, maintenance: true }, { status: 503, headers: { 'Retry-After': '120' } });
}
