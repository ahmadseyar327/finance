import { NextRequest, NextResponse } from 'next/server';
import { assetLiabilityService } from '@/lib/services/assetLiabilityService';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = assetLiabilityService.updateAsset(id, body);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Asset updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = assetLiabilityService.deleteAsset(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Asset deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
