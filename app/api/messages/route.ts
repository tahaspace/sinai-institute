import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { currentUserId } from '@/lib/student';

// GET /api/messages — the logged-in user's inbox + stats.
export async function GET() {
  try {
    const uid = await currentUserId();
    if (!uid) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const messages = await prisma.message.findMany({
      where: { recipientUserId: uid },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        from: m.senderName,
        role: m.senderRole ?? '',
        subject: m.subject,
        body: m.body,
        read: m.read,
        date: m.createdAt.toISOString().slice(0, 10),
      })),
      stats: { total: messages.length, unread: messages.filter((m) => !m.read).length },
    });
  } catch (error) {
    console.error('Error listing messages:', error);
    return NextResponse.json({ error: 'فشل في جلب الرسائل' }, { status: 500 });
  }
}

// PATCH /api/messages — mark a message read (only your own).
export async function PATCH(request: NextRequest) {
  try {
    const uid = await currentUserId();
    if (!uid) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const body = await request.json();
    const { id, read } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg || msg.recipientUserId !== uid) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const updated = await prisma.message.update({ where: { id }, data: { read: read ?? true } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'فشل في تحديث الرسالة' }, { status: 500 });
  }
}

// POST /api/messages — send a message to another user's inbox.
export async function POST(request: NextRequest) {
  try {
    const uid = await currentUserId();
    if (!uid) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const body = await request.json();
    const { recipientUserId, senderName, senderRole, subject, body: text } = body ?? {};
    if (!recipientUserId || !subject || !text) {
      return NextResponse.json({ error: 'المستلم والموضوع والنص مطلوبة' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: { recipientUserId, senderName: senderName || 'مستخدم', senderRole: senderRole || null, subject, body: text },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'فشل في إرسال الرسالة' }, { status: 500 });
  }
}
