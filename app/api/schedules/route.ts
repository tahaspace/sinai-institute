import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - الحصول على الجداول
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (year) {
      where.year = parseInt(year);
    }

    if (semester) {
      where.semester = parseInt(semester);
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        department: true,
        lectures: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في جلب الجداول' },
      { status: 500 }
    );
  }
}

// POST - إضافة جدول جديد
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
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.create({
      data: {
        departmentId,
        year: parseInt(year),
        semester,
        academicYear,
        pdfUrl: pdfUrl || null,
        isVisible: isVisible !== undefined ? isVisible : false,
        allowView: allowView !== undefined ? allowView : true,
        allowDownload: allowDownload !== undefined ? allowDownload : true,
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'فشل في إضافة الجدول' },
      { status: 500 }
    );
  }
}

// PUT - تحديث جدول
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
        { error: 'معرف الجدول مطلوب' },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data,
    });

    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في تحديث الجدول' },
      { status: 500 }
    );
  }
}

// DELETE - حذف جدول
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الجدول مطلوب' },
        { status: 400 }
      );
    }

    await prisma.schedule.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف الجدول بنجاح' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'فشل في حذف الجدول' },
      { status: 500 }
    );
  }
}
