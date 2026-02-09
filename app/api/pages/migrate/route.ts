import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Migration endpoint to transfer pages from localStorage to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pages } = body;

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'مطلوب صفحات صالحة للترحيل' },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { slug: string; error: string }[],
      skipped: [] as string[],
    };

    for (const page of pages) {
      try {
        // Check if page already exists
        const existing = await prisma.page.findUnique({
          where: { slug: page.slug },
        });

        if (existing) {
          results.skipped.push(page.slug);
          continue;
        }

        // Create new page
        await prisma.page.create({
          data: {
            titleAr: page.title || page.titleAr || 'بدون عنوان',
            titleEn: page.titleEn || page.title || 'Untitled',
            slug: page.slug,
            contentAr: page.content || '',
            contentEn: page.contentEn || page.content || '',
            parentId: page.parentId || null,
            level: page.level || 1,
            showInHeader: page.showInHeader !== undefined ? page.showInHeader : true,
            showInFooter: page.showInFooter !== undefined ? page.showInFooter : false,
            isPublished: page.status === 'published' || page.isPublished === true,
            order: page.order || 0,
            customCSS: page.customCSS || '',
            customJS: page.customJS || '',
          },
        });

        results.success.push(page.slug);
      } catch (error: any) {
        results.failed.push({
          slug: page.slug,
          error: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        message: 'اكتمل الترحيل',
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error migrating pages:', error);
    return NextResponse.json(
      { error: 'فشل الترحيل', details: error.message },
      { status: 500 }
    );
  }
}
