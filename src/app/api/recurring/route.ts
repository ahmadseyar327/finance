import { NextRequest, NextResponse } from 'next/server';
import { recurringService } from '@/lib/services/recurringService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    // Auto-process due recurring
    recurringService.processDueRecurring(familyId);

    const list = recurringService.getRecurring(familyId);
    return NextResponse.json({ success: true, data: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.description || !body.amount || !body.category_id || !body.account_id || !body.start_date || !body.frequency) {
      return NextResponse.json({ success: false, error: 'Missing required recurring fields' }, { status: 400 });
    }

    const created = recurringService.createRecurring(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
