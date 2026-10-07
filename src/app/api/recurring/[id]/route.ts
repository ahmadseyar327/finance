import { NextRequest, NextResponse } from 'next/server';
import { recurringService } from '@/lib/services/recurringService';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = recurringService.deleteRecurring(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Recurring transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Recurring transaction deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
