import { NextRequest, NextResponse } from 'next/server';
import { savingsService } from '@/lib/services/savingsService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const goals = savingsService.getGoals(familyId);
    return NextResponse.json({ success: true, data: goals });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.name || !body.target_amount || !body.target_date) {
      return NextResponse.json({ success: false, error: 'Name, target_amount, and target_date are required' }, { status: 400 });
    }

    const created = savingsService.createGoal(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
