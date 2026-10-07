import { NextRequest, NextResponse } from 'next/server';
import { savingsService } from '@/lib/services/savingsService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const goal = savingsService.getGoalById(id);
    if (!goal) {
      return NextResponse.json({ success: false, error: 'Savings goal not found' }, { status: 404 });
    }
    const contributions = savingsService.getContributions(id);
    return NextResponse.json({ success: true, data: { ...goal, contributions } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = savingsService.updateGoal(id, body);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Savings goal not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Savings goal updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = savingsService.deleteGoal(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Savings goal not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Savings goal deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
