import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Shared select that NEVER returns the password hash.
const userSelect = {
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

// GET /api/admin/platform/users — list all users with university + role assignments.
export async function GET() {
  try {
    const guard = await requirePermission('platform.user.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error listing platform users:', error);
    return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 });
  }
}

// POST /api/admin/platform/users — create a user. Body: {name,email,password,universityId?}.
export async function POST(request: Request) {
  try {
    const guard = await requirePermission('platform.user.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const universityId =
      typeof body.universityId === 'string' && body.universityId.length > 0 ? body.universityId : null;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
    }

    // Validate university exists when provided (avoids dangling FK / confusing UI).
    if (universityId) {
      const uni = await prisma.university.findUnique({ where: { id: universityId }, select: { id: true } });
      if (!uni) return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 400 });
    }

    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        // default legacy role string; finer-grained access is granted via UserRole assignments.
        role: 'EDITOR',
        universityId,
      },
      select: userSelect,
    });

    await writeAudit('platform.user.create', {
      targetType: 'User',
      targetId: user.id,
      universityId,
      metadata: { name, email, universityId },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating platform user:', error);
    return NextResponse.json({ error: 'فشل في إنشاء المستخدم' }, { status: 500 });
  }
}
