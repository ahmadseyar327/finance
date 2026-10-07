import { NextRequest, NextResponse } from 'next/server';
import { assetLiabilityService } from '@/lib/services/assetLiabilityService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const data = assetLiabilityService.getLiabilities(familyId);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.name || !body.liability_type || !body.original_amount) {
      return NextResponse.json({ success: false, error: 'Name, liability_type, original_amount are required' }, { status: 400 });
    }

    const created = assetLiabilityService.createLiability(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
