import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.problem.count();
  if (count > 0) {
    console.log('Problems already exist; skipping seeding.');
    return;
  }
  console.log('Start seeding problems (12x12)...');
  const data = [];
  for (let i = 1; i <= 12; i++) {
    for (let j = 1; j <= 12; j++) {
      data.push({ problem: `${i} x ${j}`, answer: i * j });
    }
  }
  await prisma.problem.createMany({ data });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

