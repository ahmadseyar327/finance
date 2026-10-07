import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/lib/services/reportService';
import { cache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const period = (searchParams.get('period') as '7d' | '30d' | 'month' | 'last_month' | '6m' | '12m') || 'month';

    const cacheKey = `dashboard:${familyId}:${period}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached }, {
        headers: { 'Cache-Control': 'private, max-age=30' }
      });
    }

    const data = reportService.getDashboardData(familyId, period);
    cache.set(cacheKey, data, 30_000); // 30s TTL

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, max-age=30' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
