import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pages/[id] - Get single page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: {
            order: 'asc',
          },
        },
        parent: true,
        children: {
          orderBy: {
            order: 'asc',
          },
        },
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 10, // Last 10 versions
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: 'الصفحة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json({ page }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'فشل في جلب الصفحة', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/pages/[id] - Update page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: { id },
    });

    if (!existingPage) {
      return NextResponse.json(
        { error: 'الصفحة غير موجودة' },
        { status: 404 }
      );
    }

    // Clean slug if provided
    let cleanSlug = body.slug;
    if (body.slug) {
      cleanSlug = body.slug
        .replace(/^https?:\/\//, '')  // Remove http:// or https://
        .replace(/^[^\/]*\//, '')      // Remove domain if present
        .replace(/^\/+|\/+$/g, '')     // Remove leading/trailing slashes
        .toLowerCase();
    }

    // If slug is being updated, check uniqueness
    if (cleanSlug && cleanSlug !== existingPage.slug) {
      const slugExists = await prisma.page.findUnique({
        where: { slug: cleanSlug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'الرابط (slug) مستخدم بالفعل' },
          { status: 400 }
        );
      }
    }

    // Update page
    const page = await prisma.page.update({
      where: { id },
      data: {
        ...body,
        slug: cleanSlug || body.slug,
        updatedAt: new Date(),
      },
      include: {
        blocks: true,
        parent: true,
        children: true,
      },
    });

    return NextResponse.json({ page }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'فشل في تحديث الصفحة', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/pages/[id] - Delete page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!existingPage) {
      return NextResponse.json(
        { error: 'الصفحة غير موجودة' },
        { status: 404 }
      );
    }

    // Check if page has children
    if (existingPage.children.length > 0) {
      return NextResponse.json(
        { error: 'لا يمكن حذف صفحة لديها صفحات فرعية. قم بحذف الصفحات الفرعية أولاً.' },
        { status: 400 }
      );
    }

    // Delete page (blocks will be deleted automatically due to cascade)
    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'تم حذف الصفحة بنجاح' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'فشل في حذف الصفحة', details: error.message },
      { status: 500 }
    );
  }
}
