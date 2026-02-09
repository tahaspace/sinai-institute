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

    const where: any = {};

    if (year) {
      where.year = parseInt(year);
    }

    if (semester) {
      where.semester = parseInt(semester);
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        department: true,
        studentResults: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    return NextResponse.json(results);
  } catch (error) {
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
      title,
      pdfUrl,
      published,
      allowDownload,
    } = body;

    if (!departmentId || !year || !semester || !title) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const result = await prisma.result.create({
      data: {
        departmentId,
        year: parseInt(year),
        semester: parseInt(semester),
        title,
        pdfUrl,
        published: published !== undefined ? published : true,
        allowDownload: allowDownload !== undefined ? allowDownload : true,
        publishedAt: published ? new Date() : null,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في حذف النتيجة' },
      { status: 500 }
    );
  }
}
