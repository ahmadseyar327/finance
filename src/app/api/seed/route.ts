import { NextRequest, NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const res = seedDemoData(force);
    return NextResponse.json({ ...res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
