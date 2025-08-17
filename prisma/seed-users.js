import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { name: 'Braylee' },
    update: {},
    create: { name: 'Braylee', pin: '1234', image: '/Braylee.jpg' },
  });
  await prisma.user.upsert({ where: { name: 'Dad' }, update: {}, create: { name: 'Dad', pin: '0000' } });
  await prisma.user.upsert({ where: { name: 'Mom' }, update: {}, create: { name: 'Mom', pin: '0000' } });
  console.log('Users seeded');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

