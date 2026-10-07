import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/lib/services/searchService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const q = searchParams.get('q') || '';

    const results = searchService.globalSearch(familyId, q);
    return NextResponse.json({ success: true, data: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
