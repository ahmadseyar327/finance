import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/categoryService';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = categoryService.updateCategory(id, body);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Category updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = categoryService.deleteCategory(id);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: res.message || 'Category deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
