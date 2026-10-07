import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/services/transactionService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || 'fam-demo-001';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const type = (searchParams.get('type') as 'income' | 'expense' | 'transfer' | 'all') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;
    const familyMemberId = searchParams.get('familyMemberId') || undefined;
    const search = searchParams.get('search') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25;
    const sortBy = (searchParams.get('sortBy') as 'date' | 'amount' | 'created_at') || 'date';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';

    const result = transactionService.getTransactions({
      familyId,
      startDate,
      endDate,
      type,
      categoryId,
      accountId,
      familyMemberId,
      search,
      tag,
      page,
      limit,
      sortBy,
      sortOrder
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.family_id) body.family_id = 'fam-demo-001';
    if (!body.description || !body.amount || !body.account_id || !body.date) {
      return NextResponse.json({ success: false, error: 'Missing required fields: description, amount, account_id, date' }, { status: 400 });
    }

    const tx = transactionService.createTransaction(body);
    return NextResponse.json({ success: true, data: tx }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
