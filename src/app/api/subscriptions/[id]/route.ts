import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/services/subscriptionService';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = subscriptionService.updateSubscription(id, body);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Subscription updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = subscriptionService.deleteSubscription(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Subscription deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
