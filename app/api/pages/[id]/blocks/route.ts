import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/pages/[id]/blocks - Update all blocks for a page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { blocks, createVersion = false, versionComment } = body;

    // Check if page exists
    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        blocks: true,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: 'الصفحة غير موجودة' },
        { status: 404 }
      );
    }

    // Create version if requested
    if (createVersion) {
      const nextVersion = page.currentVersion + 1;
      await prisma.pageVersion.create({
        data: {
          pageId: id,
          version: nextVersion,
          title: page.titleAr,
          blocksData: JSON.stringify(page.blocks),
          comment: versionComment,
        },
      });

      await prisma.page.update({
        where: { id },
        data: {
          currentVersion: nextVersion,
        },
      });
    }

    // Delete existing blocks
    await prisma.pageBlock.deleteMany({
      where: { pageId: id },
    });

    // Create new blocks
    const createdBlocks = await Promise.all(
      blocks.map((block: any) =>
        prisma.pageBlock.create({
          data: {
            pageId: id,
            type: block.type,
            content: JSON.stringify(block.content),
            settings: JSON.stringify(block.settings),
            order: block.order,
            parentBlockId: block.parentBlockId || null,
            desktop: block.responsive?.desktop ? JSON.stringify(block.responsive.desktop) : null,
            tablet: block.responsive?.tablet ? JSON.stringify(block.responsive.tablet) : null,
            mobile: block.responsive?.mobile ? JSON.stringify(block.responsive.mobile) : null,
            isVisible: block.isVisible !== undefined ? block.isVisible : true,
          },
        })
      )
    );

    // Update page updatedAt
    await prisma.page.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: 'تم حفظ البلوكات بنجاح',
        blocks: createdBlocks,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving blocks:', error);
    return NextResponse.json(
      { error: 'فشل في حفظ البلوكات', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/pages/[id]/blocks - Get all blocks for a page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const blocks = await prisma.pageBlock.findMany({
      where: { pageId: id },
      orderBy: {
        order: 'asc',
      },
    });

    // Parse JSON fields
    const parsedBlocks = blocks.map((block) => ({
      ...block,
      content: JSON.parse(block.content),
      settings: JSON.parse(block.settings),
      responsive: {
        desktop: block.desktop ? JSON.parse(block.desktop) : undefined,
        tablet: block.tablet ? JSON.parse(block.tablet) : undefined,
        mobile: block.mobile ? JSON.parse(block.mobile) : undefined,
      },
    }));

    return NextResponse.json({ blocks: parsedBlocks }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json(
      { error: 'فشل في جلب البلوكات', details: error.message },
      { status: 500 }
    );
  }
}
