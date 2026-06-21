import { NextRequest, NextResponse } from 'next/server';
import { captureAllTenants } from '@/lib/reporting/snapshot';

// Nightly KPI snapshot (ClientR3 — polish). Triggered by Vercel Cron (vercel.json). Secured: in
// production it requires the Vercel cron Authorization (CRON_SECRET). Node runtime for Prisma.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron routes when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const res = await captureAllTenants();
    return NextResponse.json({ ok: true, ...res, at: new Date().toISOString() });
  } catch (e) {
    console.error('KPI snapshot cron failed:', e);
    return NextResponse.json({ error: 'snapshot failed' }, { status: 500 });
  }
}
