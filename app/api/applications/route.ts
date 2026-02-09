import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - الحصول على جميع الطلبات
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في جلب الطلبات' },
      { status: 500 }
    );
  }
}

// POST - إضافة طلب جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      nationalId,
      birthDate,
      phone,
      email,
      address,
      highSchoolGrade,
      highSchoolYear,
      firstChoice,
      secondChoice,
      thirdChoice,
    } = body;

    if (!fullName || !nationalId || !phone || !email || !firstChoice) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    // التحقق من عدم تكرار الرقم القومي
    const existingApplication = await prisma.application.findUnique({
      where: { nationalId },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'تم التقديم بهذا الرقم القومي من قبل' },
        { status: 400 }
      );
    }

    const application = await prisma.application.create({
      data: {
        fullName,
        nationalId,
        birthDate: new Date(birthDate),
        phone,
        email,
        address,
        highSchoolGrade: parseFloat(highSchoolGrade),
        highSchoolYear: parseInt(highSchoolYear),
        firstChoice,
        secondChoice: secondChoice || null,
        thirdChoice: thirdChoice || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Application creation error:', error);
    return NextResponse.json(
      { error: 'فشل في إرسال الطلب' },
      { status: 500 }
    );
  }
}

// PUT - تحديث حالة طلب
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
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'معرف الطلب والحالة مطلوبان' },
        { status: 400 }
      );
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        status,
        notes,
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في تحديث الطلب' },
      { status: 500 }
    );
  }
}
