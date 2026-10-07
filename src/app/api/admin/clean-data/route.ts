import { NextResponse } from 'next/server';
import { resetToCleanFamilyData } from '@/lib/cleanData';
import { cache } from '@/lib/cache';

export async function POST() {
  try {
    const res = resetToCleanFamilyData();
    cache.invalidateAll();
    return NextResponse.json(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error cleaning data';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
