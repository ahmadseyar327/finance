import { NextRequest, NextResponse } from 'next/server';
import { debtService } from '@/lib/services/debtService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const debt = debtService.getDebtById(id);
    if (!debt) {
      return NextResponse.json({ success: false, error: 'Debt record not found' }, { status: 404 });
    }
    const payments = debtService.getPayments(id);
    return NextResponse.json({ success: true, data: { ...debt, payments } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = debtService.deleteDebt(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Debt record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Debt record deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
