import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/lib/services/auditService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const logs = auditService.getRecentLogs(familyId, limit);
    return NextResponse.json({ success: true, data: logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
