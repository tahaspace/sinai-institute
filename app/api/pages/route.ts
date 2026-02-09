import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pages - Get all pages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeBlocks = searchParams.get('includeBlocks') === 'true';
    const published = searchParams.get('published') === 'true';
    const slug = searchParams.get('slug');

    const where: any = {};
    
    if (published) {
      where.isPublished = true;
    }
    
    if (slug) {
      where.slug = slug;
    }

    const pages = await prisma.page.findMany({
      where,
      include: {
        blocks: includeBlocks,
        parent: true,
        children: true,
      },
      orderBy: [
        { level: 'asc' },
        { order: 'asc' },
      ],
    });

    return NextResponse.json({ pages }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'فشل في جلب الصفحات', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pages - Create new page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      titleAr,
      titleEn,
      slug,
      parentId,
      level = 1,
      showInHeader = false,
      showInFooter = false,
      isPublished = false,
      order = 0,
      metaTitle,
      metaDesc,
      metaKeywords,
      ogImage,
      template = 'blank',
      customCSS,
      customJS,
    } = body;

    // Validate required fields
    if (!titleAr || !titleEn || !slug) {
      return NextResponse.json(
        { error: 'العنوان والرابط مطلوبان' },
        { status: 400 }
      );
    }

    // Clean slug: remove protocol, domain, and leading/trailing slashes
    let cleanSlug = slug
      .replace(/^https?:\/\//, '')  // Remove http:// or https://
      .replace(/^[^\/]*\//, '')      // Remove domain if present
      .replace(/^\/+|\/+$/g, '')     // Remove leading/trailing slashes
      .toLowerCase();

    // Check if slug is unique
    const existingPage = await prisma.page.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: 'الرابط (slug) مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // Create page
    const page = await prisma.page.create({
      data: {
        titleAr,
        titleEn,
        slug: cleanSlug,
        parentId,
        level,
        showInHeader,
        showInFooter,
        isPublished,
        order,
        metaTitle,
        metaDesc,
        metaKeywords,
        ogImage,
        template,
        customCSS,
        customJS,
      },
      include: {
        blocks: true,
        parent: true,
        children: true,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'فشل في إنشاء الصفحة', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/pages - Update page content by slug
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, contentAr, contentEn, customCSS, customJS } = body;

    // Validate required fields
    if (!slug) {
      return NextResponse.json(
        { error: 'الرابط (slug) مطلوب' },
        { status: 400 }
      );
    }

    // Find the page
    const existingPage = await prisma.page.findUnique({
      where: { slug },
    });

    if (!existingPage) {
      return NextResponse.json(
        { error: 'الصفحة غير موجودة' },
        { status: 404 }
      );
    }

    // Update page content
    const updatedPage = await prisma.page.update({
      where: { slug },
      data: {
        contentAr: contentAr !== undefined ? contentAr : existingPage.contentAr,
        contentEn: contentEn !== undefined ? contentEn : existingPage.contentEn,
        customCSS: customCSS !== undefined ? customCSS : existingPage.customCSS,
        customJS: customJS !== undefined ? customJS : existingPage.customJS,
        updatedAt: new Date(),
      },
      include: {
        blocks: true,
        parent: true,
        children: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'تم تحديث محتوى الصفحة بنجاح',
      page: updatedPage 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'فشل في تحديث الصفحة', details: error.message },
      { status: 500 }
    );
  }
}
