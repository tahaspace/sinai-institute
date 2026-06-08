import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

// GET /api/faculty/research — the instructor's publications + research metrics.
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const pubs = await prisma.publication.findMany({
      where: { instructorId: instructor.id },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    const publications = pubs.map((p) => ({
      id: p.id,
      title: p.title,
      venue: p.venue ?? '',
      year: p.year,
      type: p.type,
      citations: p.citations,
      impactFactor: p.impactFactor,
      status: p.status,
    }));

    const totalCitations = pubs.reduce((s, p) => s + p.citations, 0);
    return NextResponse.json({
      publications,
      // No separate research-project model yet; surfaced empty rather than fabricated.
      researchProjects: [],
      stats: {
        total: pubs.length,
        published: pubs.filter((p) => p.status === 'published').length,
        underReview: pubs.filter((p) => p.status === 'under-review').length,
        totalCitations,
        journal: pubs.filter((p) => p.type === 'journal').length,
        conference: pubs.filter((p) => p.type === 'conference').length,
        book: pubs.filter((p) => p.type === 'book').length,
      },
    });
  } catch (error) {
    console.error('Error fetching research:', error);
    return NextResponse.json({ error: 'فشل في جلب الأبحاث' }, { status: 500 });
  }
}

// POST /api/faculty/research — add a publication.
export async function POST(request: NextRequest) {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const body = await request.json();
    const { title, venue, year, type, citations, status } = body ?? {};
    if (!title) return NextResponse.json({ error: 'عنوان البحث مطلوب' }, { status: 400 });

    const pub = await prisma.publication.create({
      data: {
        instructorId: instructor.id,
        title,
        venue: venue || null,
        year: year ? parseInt(String(year), 10) : null,
        type: type || 'journal',
        citations: citations ? parseInt(String(citations), 10) : 0,
        status: status || 'published',
      },
    });
    return NextResponse.json(pub, { status: 201 });
  } catch (error) {
    console.error('Error creating publication:', error);
    return NextResponse.json({ error: 'فشل في إضافة البحث' }, { status: 500 });
  }
}
