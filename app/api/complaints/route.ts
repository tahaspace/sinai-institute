import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - الحصول على جميع الشكاوى
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
    const type = searchParams.get('type');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(complaints);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في جلب الشكاوى' },
      { status: 500 }
    );
  }
}

// POST - إضافة شكوى جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentName,
      studentId,
      phone,
      email,
      type,
      subject,
      message,
      attachments,
    } = body;

    if (!studentName || !phone || !type || !subject || !message) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.create({
      data: {
        studentName,
        studentId,
        phone,
        email,
        type,
        subject,
        message,
        attachments: attachments || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(complaint, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في إرسال الشكوى' },
      { status: 500 }
    );
  }
}

// PUT - تحديث شكوى
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
    const { id, status, response } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الشكوى مطلوب' },
        { status: 400 }
      );
    }

    const data: any = {};

    if (status) {
      data.status = status;
    }

    if (response) {
      data.response = response;
      data.respondedAt = new Date();
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data,
    });

    return NextResponse.json(complaint);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في تحديث الشكوى' },
      { status: 500 }
    );
  }
}
