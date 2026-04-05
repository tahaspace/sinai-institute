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
      where.isPublished = published === 'true';
    }

    const news = await prisma.news.findMany({
      where,
      orderBy: {
        publishDate: 'desc',
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
      category,
      image,
      published,
      featured,
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
        titleAr: title,
        titleEn: '',
        contentAr: content,
        contentEn: '',
        category: category || 'NEWS',
        image: image || null,
        isPublished: published !== undefined ? published : true,
        isFeatured: featured || false,
        isInTicker: showInTicker || false,
        publishDate: published !== false ? new Date() : null,
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
    const { id, title, content, image, category, published } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الخبر مطلوب' },
        { status: 400 }
      );
    }

    const news = await prisma.news.update({
      where: { id },
      data: {
        ...(title !== undefined && { titleAr: title }),
        ...(content !== undefined && { contentAr: content }),
        ...(image !== undefined && { image: image || null }),
        ...(category !== undefined && { category }),
        ...(published !== undefined && {
          isPublished: published,
          // Restore publishDate when re-publishing a previously unpublished item
          ...(published === true && { publishDate: new Date() }),
        }),
      },
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
