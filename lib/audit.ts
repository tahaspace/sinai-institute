/**
 * Audit trail helper. Every mutating admin action calls writeAudit(...).
 * Never throws — a failed audit write must not break the underlying operation.
 * AuditLog uses plain scalar columns (no FK), so the hardcoded super-admin id
 * ('dev-admin-001') is stored fine even though it isn't a real User row.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function writeAudit(
  action: string,
  opts?: { targetType?: string; targetId?: string | null; metadata?: unknown; universityId?: string | null; ip?: string | null }
): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const actorUserId = (session?.user as { id?: string } | undefined)?.id ?? null;
    await prisma.auditLog.create({
      data: {
        action,
        actorUserId,
        targetType: opts?.targetType ?? null,
        targetId: opts?.targetId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (opts?.metadata as any) ?? undefined,
        universityId: opts?.universityId ?? null,
        ip: opts?.ip ?? null,
      },
    });
  } catch (e) {
    console.error('audit write failed:', e);
  }
}
