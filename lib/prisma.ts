import { PrismaClient } from '@prisma/client';
import { getTenantCtx, TENANT_SCOPED_MODELS } from '@/lib/tenant-context';

const globalForPrisma = global as unknown as { prisma: ReturnType<typeof makeClient> };

const READ_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany',
]);

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Tenant-scoping safety net. Active ONLY when a request set a tenant context
  // via runWithTenant(); otherwise pass-through (scripts / un-migrated routes).
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = getTenantCtx();
          if (!ctx || ctx.bypass || !ctx.universityId || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args as never);
          }
          const a = (args ?? {}) as Record<string, unknown>;
          if (READ_OPS.has(operation)) {
            a.where = { AND: [a.where ?? {}, { universityId: ctx.universityId }] };
          } else if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            // promote to tenant-filtered findFirst semantics
            a.where = { AND: [a.where ?? {}, { universityId: ctx.universityId }] };
          } else if (operation === 'create') {
            const data = (a.data ?? {}) as Record<string, unknown>;
            if (data.universityId == null) data.universityId = ctx.universityId;
            a.data = data;
          } else if (operation === 'createMany' && Array.isArray(a.data)) {
            a.data = (a.data as Record<string, unknown>[]).map((d) => ({ universityId: ctx.universityId, ...d }));
          } else if (operation === 'upsert') {
            const create = (a.create ?? {}) as Record<string, unknown>;
            if (create.universityId == null) create.universityId = ctx.universityId;
            a.create = create;
            a.where = { AND: [a.where ?? {}, { universityId: ctx.universityId }] };
          }
          return query(a as never);
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma || makeClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
