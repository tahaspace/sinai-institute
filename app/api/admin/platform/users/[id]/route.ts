import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Single-user select — includes full role-assignment scope, never the password.
const userDetailSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  title: true,
  universityId: true,
  isPlatformAdmin: true,
  createdAt: true,
  university: { select: { id: true, nameAr: true, nameEn: true } },
  userRoles: {
    select: {
      id: true,
      facultyId: true,
      departmentId: true,
      role: { select: { id: true, key: true, nameAr: true, nameEn: true } },
    },
  },
} as const;

// GET /api/admin/platform/users/[id] — one user with role/faculty/department assignments.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('platform.user.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: userDetailSelect });
    if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    // Resolve human-readable names for the assignment scopes (faculty/department).
    const facultyIds = [...new Set(user.userRoles.map((ur) => ur.facultyId).filter(Boolean) as string[])];
    const departmentIds = [...new Set(user.userRoles.map((ur) => ur.departmentId).filter(Boolean) as string[])];
    const [faculties, departments] = await Promise.all([
      facultyIds.length
        ? prisma.faculty.findMany({ where: { id: { in: facultyIds } }, select: { id: true, nameAr: true } })
        : Promise.resolve([]),
      departmentIds.length
        ? prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, nameAr: true } })
        : Promise.resolve([]),
    ]);
    const facultyName = new Map(faculties.map((f) => [f.id, f.nameAr]));
    const departmentName = new Map(departments.map((d) => [d.id, d.nameAr]));

    const userRoles = user.userRoles.map((ur) => ({
      ...ur,
      facultyName: ur.facultyId ? facultyName.get(ur.facultyId) ?? null : null,
      departmentName: ur.departmentId ? departmentName.get(ur.departmentId) ?? null : null,
    }));

    // Reference data the edit page needs for its Select inputs.
    const [universities, roles] = await Promise.all([
      prisma.university.findMany({ orderBy: { nameAr: 'asc' }, select: { id: true, nameAr: true, nameEn: true } }),
      prisma.role.findMany({
        orderBy: [{ universityId: 'asc' }, { nameAr: 'asc' }],
        select: { id: true, key: true, nameAr: true, nameEn: true, universityId: true },
      }),
    ]);
    const faculty = await prisma.faculty.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, nameAr: true, universityId: true },
    });
    const allDepartments = await prisma.department.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, nameAr: true, facultyId: true, universityId: true },
    });

    return NextResponse.json({
      user: { ...user, userRoles },
      universities,
      roles,
      faculties: faculty,
      departments: allDepartments,
    });
  } catch (error) {
    console.error('Error fetching platform user:', error);
    return NextResponse.json({ error: 'فشل في جلب المستخدم' }, { status: 500 });
  }
}

// PATCH /api/admin/platform/users/[id] — update name/title/universityId.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('platform.user.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: { name?: string; title?: string | null; universityId?: string | null } = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
      data.name = name;
    }
    if ('title' in body) {
      data.title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
    }
    if ('universityId' in body) {
      const universityId =
        typeof body.universityId === 'string' && body.universityId.length > 0 ? body.universityId : null;
      if (universityId) {
        const uni = await prisma.university.findUnique({ where: { id: universityId }, select: { id: true } });
        if (!uni) return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 400 });
      }
      data.universityId = universityId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 });
    }

    const user = await prisma.user.update({ where: { id }, data, select: userDetailSelect });

    await writeAudit('platform.user.update', {
      targetType: 'User',
      targetId: id,
      universityId: user.universityId,
      metadata: data,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating platform user:', error);
    return NextResponse.json({ error: 'فشل في تحديث المستخدم' }, { status: 500 });
  }
}
