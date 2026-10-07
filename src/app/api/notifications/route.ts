import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 30;

    const res = notificationService.getNotifications(familyId, limit);
    return NextResponse.json({ success: true, ...res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';

    if (body.action === 'mark_all_read') {
      notificationService.markAllAsRead(familyId);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    const created = notificationService.createNotification(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
