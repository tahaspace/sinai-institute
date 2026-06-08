import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - الحصول على النتائج
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    const where: Record<string, unknown> = {};

    if (year) {
      where.year = parseInt(year, 10);
    }

    if (semester) {
      // `semester` is a String column in the Result model — match it as-is.
      where.semester = semester;
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        department: true,
        students: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: 'فشل في جلب النتائج' },
      { status: 500 }
    );
  }
}

// POST - إضافة نتيجة جديدة
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      departmentId,
      year,
      semester,
      academicYear,
      pdfUrl,
      isVisible,
      allowView,
      allowDownload,
    } = body;

    if (!departmentId || !year || !semester || !academicYear) {
      return NextResponse.json(
        { error: 'القسم والسنة والفصل والعام الدراسي مطلوبة' },
        { status: 400 }
      );
    }

    const result = await prisma.result.create({
      data: {
        departmentId,
        year: parseInt(String(year), 10),
        semester: String(semester),
        academicYear: String(academicYear),
        pdfUrl: pdfUrl || null,
        isVisible: isVisible !== undefined ? isVisible : false,
        allowView: allowView !== undefined ? allowView : true,
        allowDownload: allowDownload !== undefined ? allowDownload : true,
        publishDate: isVisible ? new Date() : null,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'فشل في إضافة النتيجة' },
      { status: 500 }
    );
  }
}

// PUT - تحديث نتيجة
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف النتيجة مطلوب' },
        { status: 400 }
      );
    }

    const result = await prisma.result.update({
      where: { id },
      data,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'فشل في تحديث النتيجة' },
      { status: 500 }
    );
  }
}

// DELETE - حذف نتيجة
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'معرف النتيجة مطلوب' },
        { status: 400 }
      );
    }

    await prisma.result.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف النتيجة بنجاح' });
  } catch {
    return NextResponse.json(
      { error: 'فشل في حذف النتيجة' },
      { status: 500 }
    );
  }
}
