import { PrismaClient } from '@prisma/client';
import { main as seedUsers } from './seed-users.js'; // Import the user seeding function
import { buildTimesTableProblems } from '../lib/timesTableProblems.js';
const prisma = new PrismaClient();

async function main() {
  // Seed problems
  const problemCount = await prisma.problem.count();
  if (problemCount > 0) {
    console.log('Problems already exist; skipping problem seeding.');
  } else {
    console.log('Start seeding problems (12x12)...');
    await prisma.problem.createMany({ data: buildTimesTableProblems() });
    console.log('Problem seeding finished.');
  }

  // Seed users
  await seedUsers();
  console.log('User seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
