import { NextRequest, NextResponse } from 'next/server';
import { familyService } from '@/lib/services/familyService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const members = familyService.getMembers(familyId);
    return NextResponse.json({ success: true, data: members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.name || !body.relationship) {
      return NextResponse.json({ success: false, error: 'Name and relationship are required' }, { status: 400 });
    }

    const created = familyService.createMember(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
