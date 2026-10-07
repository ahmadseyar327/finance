import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/categoryService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const type = (searchParams.get('type') as 'expense' | 'income') || undefined;
    const flat = searchParams.get('flat') === 'true';

    if (flat) {
      const all = categoryService.getAllFlat(familyId);
      return NextResponse.json({ success: true, data: all });
    }

    const categories = categoryService.getCategories(familyId, type);
    return NextResponse.json({ success: true, data: categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const familyId = body.family_id || 'fam-demo-001';
    if (!body.name || !body.type) {
      return NextResponse.json({ success: false, error: 'Name and type are required' }, { status: 400 });
    }

    const created = categoryService.createCategory(familyId, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
