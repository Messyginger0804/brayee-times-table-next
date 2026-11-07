
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
const prisma = new PrismaClient();

// Braylee is the only real account (everyone else plays as a guest seat, see lib/guests.js).
// PINs are stored as bcrypt hashes. Existing users are never touched (update: {}),
// so re-running the seed cannot overwrite a changed PIN or a prod hash.
const hash = (pin) => bcrypt.hash(pin, 10);

// The PIN comes from SEED_BRAYLEE_PIN (exactly 6 digits, the student ID rule in lib/cadetNames.js). If unset, a random one is generated and printed once,
// only when the user row is actually created. No PIN is ever stored in source.
function resolvePin() {
  const fromEnv = process.env.SEED_BRAYLEE_PIN;
  if (fromEnv === undefined || fromEnv === '') return { pin: String(randomInt(0, 1000000)).padStart(6, '0'), generated: true };
  if (!/^\d{6}$/.test(fromEnv)) throw new Error('SEED_BRAYLEE_PIN must be exactly 6 digits (0-9 only)');
  return { pin: fromEnv, generated: false };
}

export async function main() {
  const { pin, generated } = resolvePin(); // validate up front so a bad value fails loudly even if the user exists
  const existing = await prisma.user.findUnique({ where: { name: 'Braylee' } });
  await prisma.user.upsert({
    where: { name: 'Braylee' },
    update: {},
    create: { name: 'Braylee', pin: await hash(pin), image: '/braylee/face-512.webp' },
  });
  if (!existing && generated) console.log(`Braylee's PIN was generated (shown once, save it now): ${pin}`);
  console.log('Users seeded');
}
