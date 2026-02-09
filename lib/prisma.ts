import { PrismaClient } from '@prisma/client';

// Get database URL from environment variables
const getDatabaseUrl = () => {
  // Always use DATABASE_URL from environment
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('🔍 Using DATABASE_URL from env:', url.substring(0, 50) + '...');
  return url;
};

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
