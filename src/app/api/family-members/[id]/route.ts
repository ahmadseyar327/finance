import { NextRequest, NextResponse } from 'next/server';
import { familyService } from '@/lib/services/familyService';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = familyService.updateMember(id, body);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Family member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Family member updated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = familyService.archiveMember(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Family member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Family member archived' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
