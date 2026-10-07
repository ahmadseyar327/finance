import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/services/accountService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.from_account_id || !body.to_account_id || !body.amount || !body.date) {
      return NextResponse.json({ success: false, error: 'Missing required transfer fields: from_account_id, to_account_id, amount, date' }, { status: 400 });
    }

    const res = accountService.transfer(
      familyId,
      body.from_account_id,
      body.to_account_id,
      body.amount,
      body.date,
      body.description || 'Account Transfer',
      body.family_member_id
    );

    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
