import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - الحصول على جميع الأخبار
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const published = searchParams.get('published');

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (published !== null) {
      where.published = published === 'true';
    }

    const news = await prisma.news.findMany({
      where,
      orderBy: {
        publishedAt: 'desc',
      },
    });

    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في جلب الأخبار' },
      { status: 500 }
    );
  }
}

// POST - إضافة خبر جديد
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
      title,
      content,
      summary,
      category,
      image,
      published,
      featured,
      showInSlider,
      showInTicker,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'العنوان والمحتوى مطلوبان' },
        { status: 400 }
      );
    }

    const news = await prisma.news.create({
      data: {
        title,
        content,
        summary,
        category: category || 'GENERAL',
        image,
        published: published !== undefined ? published : true,
        featured: featured || false,
        showInSlider: showInSlider || false,
        showInTicker: showInTicker || false,
        publishedAt: published ? new Date() : null,
      },
    });

    return NextResponse.json(news, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في إضافة الخبر' },
      { status: 500 }
    );
  }
}

// PUT - تحديث خبر
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
        { error: 'معرف الخبر مطلوب' },
        { status: 400 }
      );
    }

    const news = await prisma.news.update({
      where: { id },
      data,
    });

    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في تحديث الخبر' },
      { status: 500 }
    );
  }
}

// DELETE - حذف خبر
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
        { error: 'معرف الخبر مطلوب' },
        { status: 400 }
      );
    }

    await prisma.news.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف الخبر بنجاح' });
  } catch (error) {
    return NextResponse.json(
      { error: 'فشل في حذف الخبر' },
      { status: 500 }
    );
  }
}
