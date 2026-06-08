import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET - جلب جميع رسائل "اتصل بنا" (مقيّد بالموظفين/لوحة التحكم)
export async function GET(request: NextRequest) {
  const auth = await requirePermission('cms.message.view');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const isReadParam = searchParams.get('isRead');

    const where: { isRead?: boolean } = {};
    if (isReadParam === 'true') where.isRead = true;
    if (isReadParam === 'false') where.isRead = false;

    const items = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في جلب الرسائل' },
      { status: 500 }
    );
  }
}

// POST - استقبال رسالة من نموذج "اتصل بنا" العام (بدون مصادقة، مثل /api/complaints)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const created = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في إرسال الرسالة' },
      { status: 500 }
    );
  }
}

// PATCH - تعليم رسالة كمقروءة أو حفظ الرد (مقيّد بالموظفين)
export async function PATCH(request: NextRequest) {
  const auth = await requirePermission('cms.message.view');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, isRead, response } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الرسالة مطلوب' },
        { status: 400 }
      );
    }

    const data: { isRead?: boolean; response?: string } = {};
    if (typeof isRead === 'boolean') data.isRead = isRead;
    if (typeof response === 'string') {
      data.response = response;
      data.isRead = true; // الرد على الرسالة يعني أنها قُرئت
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في تحديث الرسالة' },
      { status: 500 }
    );
  }
}
