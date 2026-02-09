import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - الحصول على جميع الأقسام
export async function GET(request: NextRequest) {
  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
      },
      include: {
        specializations: true,
        _count: {
          select: {
            specializations: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'فشل في جلب الأقسام' },
      { status: 500 }
    );
  }
}

// POST - إضافة قسم جديد
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
    const { nameAr, nameEn, description, image, head, order, isActive } = body;

    if (!nameAr || !nameEn) {
      return NextResponse.json(
        { error: 'الاسم العربي والإنجليزي مطلوبان' },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        nameAr,
        nameEn,
        description,
        image,
        head,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'فشل في إضافة القسم' },
      { status: 500 }
    );
  }
}

// PUT - تحديث قسم
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
        { error: 'معرف القسم مطلوب' },
        { status: 400 }
      );
    }

    const department = await prisma.department.update({
      where: { id },
      data,
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'فشل في تحديث القسم' },
      { status: 500 }
    );
  }
}

// DELETE - حذف قسم
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف القسم مطلوب' },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف القسم بنجاح' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'فشل في حذف القسم' },
      { status: 500 }
    );
  }
}
