import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const news = await prisma.news.findMany();
  console.log("Total News rows:", news.length);
  news.forEach(n => {
    console.log(`- ID: ${n.id}, Category: ${n.category}, isPublished: ${n.isPublished}, Title: ${n.titleAr}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
