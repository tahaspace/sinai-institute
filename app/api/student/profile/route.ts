import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

// GET /api/student/profile — personal + guardian details for the student.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const base = await resolveStudent(searchParams.get('studentCode'));
    if (!base) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: base.id },
      include: { department: true, guardians: true },
    });
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const father = student.guardians.find((g) => g.relation === 'father');
    const mother = student.guardians.find((g) => g.relation === 'mother');

    return NextResponse.json({
      studentData: {
        id: student.studentCode,
        name: student.nameAr,
        nameEn: student.nameEn ?? '',
        email: student.email ?? '',
        phone: student.phone ?? '',
        nationalId: student.nationalId ?? '',
        birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : '',
        address: student.address ?? '',
        grade: student.department?.nameAr ?? '',
        section: student.section ?? '',
        enrollmentDate: student.enrollYear ? `${student.enrollYear}-09-01` : '',
        status: student.status.toLowerCase(),
      },
      parentInfo: {
        fatherName: father?.name ?? '',
        fatherPhone: father?.phone ?? '',
        fatherJob: father?.job ?? '',
        motherName: mother?.name ?? '',
        motherPhone: mother?.phone ?? '',
        motherJob: mother?.job ?? '',
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'فشل في جلب الملف الشخصي' }, { status: 500 });
  }
}

// PATCH /api/student/profile — the logged-in student updates their own editable fields.
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const body = await request.json();
    // Only these fields are student-editable; identity fields (studentCode,
    // nationalId, gpa, level, status, department) are not self-serviceable.
    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string') data.nameAr = body.name;
    if (typeof body.nameEn === 'string') data.nameEn = body.nameEn;
    if (typeof body.email === 'string') data.email = body.email || null;
    if (typeof body.phone === 'string') data.phone = body.phone || null;
    if (typeof body.address === 'string') data.address = body.address || null;

    const updated = await prisma.student.update({ where: { id: student.id }, data });
    return NextResponse.json({ ok: true, studentData: { id: updated.studentCode, name: updated.nameAr, nameEn: updated.nameEn ?? '', email: updated.email ?? '', phone: updated.phone ?? '', address: updated.address ?? '' } });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'فشل في تحديث الملف الشخصي' }, { status: 500 });
  }
}
