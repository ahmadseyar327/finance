'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Receipt,
  Tag,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';

interface TransactionItem {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  time: string;
  description: string;
  category_name?: string;
  account_name?: string;
  to_account_name?: string;
  member_name?: string;
  member_color?: string;
  merchant?: string;
  payment_method: string;
  tags?: string;
  notes?: string;
  receipt_url?: string;
}

export const TransactionsView: React.FC = () => {
  const { familyId, formatCurrency, openQuickAdd, refreshKey, triggerRefresh, showToast } = useApp();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        familyId,
        page: page.toString(),
        limit: '20'
      });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.transactions);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, page, typeFilter, search, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Transaction removed & balance adjusted');
      setDeleteId(null);
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ID', 'Date', 'Type', 'Description', 'Amount', 'Category', 'Account', 'Member', 'Merchant', 'Notes'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.category_name || '').replace(/"/g, '""')}"`,
      `"${(t.account_name || '').replace(/"/g, '""')}"`,
      `"${(t.member_name || '').replace(/"/g, '""')}"`,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV successfully');
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {total} records · Real-time double-entry verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => openQuickAdd('expense')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-2">
        <div className="flex gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search memo, merchant..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-800/80 overflow-x-auto">
            {['all', 'expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {(search || startDate || endDate || typeFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setTypeFilter('all'); setPage(1); }}
              className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold px-2"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Date Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" />
        </div>
      </div>

      {/* Transactions — Mobile Cards */}
      <div className="sm:hidden space-y-2">
        {transactions.length > 0 ? transactions.map((tx) => {
          const isIncome = tx.type === 'income';
          const isTransfer = tx.type === 'transfer';
          return (
            <div key={tx.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                isTransfer ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                {isIncome ? <ArrowUpRight className="h-4 w-4" /> : isTransfer ? <ArrowLeftRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{tx.description}</div>
                <div className="text-[10px] text-slate-400">{tx.date} · {tx.category_name || (isTransfer ? 'Transfer' : 'Uncategorized')} · {tx.account_name}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold ${
                  isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                  isTransfer ? 'text-indigo-600 dark:text-indigo-400' :
                  'text-slate-900 dark:text-white'}`}>
                  {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(tx.amount)}
                </span>
                <button onClick={() => setDeleteId(tx.id)} className="rounded-lg p-1 text-slate-400 hover:text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="py-12 text-center text-xs text-slate-400">No transactions match your search criteria.</div>
        )}
      </div>

      {/* Transactions — Desktop Table */}
      <div className="hidden sm:block rounded-3xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 font-semibold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Description & Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isTransfer = tx.type === 'transfer';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{tx.date}</div>
                        <div className="text-[10px] text-slate-400">{tx.time || '12:00'}</div>
                      </td>

                      {/* Description & Merchant */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : isTransfer
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : isTransfer ? (
                              <ArrowLeftRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{tx.description}</div>
                            {tx.merchant && (
                              <div className="text-[11px] text-slate-400">{tx.merchant}</div>
                            )}
                            {tx.tags && (
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {tx.tags.split(',').map((tag) => (
                                  <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] text-slate-500 dark:bg-slate-800">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {tx.category_name || (isTransfer ? 'Transfer' : 'Uncategorized')}
                        </span>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200">
                          {isTransfer ? `${tx.account_name} → ${tx.to_account_name}` : tx.account_name}
                        </div>
                        <div className="text-[10px] text-slate-400">{tx.payment_method}</div>
                      </td>

                      {/* Member */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.member_name ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: tx.member_color || '#6366F1' }}
                            />
                            <span className="text-slate-700 dark:text-slate-300">{tx.member_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Household</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isTransfer
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {isIncome ? '+' : isTransfer ? '' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setDeleteId(tx.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No transactions match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50 text-xs">
          <span className="text-slate-500 hidden sm:inline">
            Page {page} of {totalPages} ({total} total)
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>
            <span className="sm:hidden text-slate-500">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Transaction?</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Removing this transaction will safely reverse its effect on your account balance.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
