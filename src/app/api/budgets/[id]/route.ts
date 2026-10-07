import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/lib/services/budgetService';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = budgetService.updateBudget(id, body);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Budget not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Budget updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = budgetService.deleteBudget(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Budget not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Budget deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
