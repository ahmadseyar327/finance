import { NextRequest, NextResponse } from 'next/server';
import { assetLiabilityService } from '@/lib/services/assetLiabilityService';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = assetLiabilityService.deleteLiability(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Liability not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Liability deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
