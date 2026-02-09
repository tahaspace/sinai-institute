import { PrismaClient } from '@prisma/client';

// Get database URL - hardcoded for production, env for development
const getDatabaseUrl = () => {
  // In production (Vercel), always use Supabase hardcoded
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    const supabaseUrl = 'postgresql://postgres.eacpjbbpwonwmthutxow:SinaiInstitute2026!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
    console.log('🔍 Using Supabase (hardcoded for production)');
    return supabaseUrl;
  }
  
  // In development, use environment variable
  console.log('🔍 Using DATABASE_URL from env:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  return process.env.DATABASE_URL;
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
