
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

// Braylee is the only real account (everyone else plays as a guest seat, see lib/guests.js).
// PINs are stored as bcrypt hashes. Existing users are never touched (update: {}),
// so re-running the seed cannot overwrite a changed PIN or a prod hash.
const hash = (pin) => bcrypt.hash(pin, 10);

export async function main() {
  await prisma.user.upsert({
    where: { name: 'Braylee' },
    update: {},
    create: { name: 'Braylee', pin: await hash('5106'), image: '/Braylee.jpg' },
  });
  console.log('Users seeded');
}

