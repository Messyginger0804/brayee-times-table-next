
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function main() {
  await prisma.user.upsert({
    where: { name: 'Braylee' },
    update: { pin: '5106' },
    create: { name: 'Braylee', pin: '5106', image: '/Braylee.jpg' },
  });
  await prisma.user.upsert({ 
    where: { name: 'Dad' }, 
    update: {},
    create: { name: 'Dad', pin: '0000' } 
  });
  await prisma.user.upsert({
    where: { name: 'Mom' }, 
    update: {},
    create: { name: 'Mom', pin: '0000' } 
  });
  await prisma.user.upsert({
    where: { name: 'test' },
    update: {},
    create: { name: 'test', pin: '1234' },
  });
  console.log('Users seeded');
}

