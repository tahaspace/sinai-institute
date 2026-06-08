import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function update() {
  const result = await prisma.news.updateMany({
    where: { category: 'NEWS' },
    data: { category: 'INSTITUTE_NEWS' }
  });
  console.log("Updated rows:", result.count);
}

update()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
