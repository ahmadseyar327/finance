'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Repeat,
  Plus,
  Play,
  Trash2,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  X,
  CheckCircle2
} from 'lucide-react';

interface RecurringItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_name?: string;
  account_name?: string;
  member_name?: string;
  frequency: string;
  start_date: string;
  next_occurrence: string;
  description: string;
  auto_create: number;
  status: 'active' | 'paused';
}

interface AccountOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

export const RecurringView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0]);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, aRes, cRes] = await Promise.all([
        fetch(`/api/recurring?familyId=${familyId}`),
        fetch(`/api/accounts?familyId=${familyId}`),
        fetch(`/api/categories?familyId=${familyId}&flat=true`)
      ]);
      const rJson = await rRes.json();
      const aJson = await aRes.json();
      const cJson = await cRes.json();

      if (rJson.success) setRecurring(rJson.data);
      if (aJson.success) {
        setAccounts(aJson.data);
        if (aJson.data.length > 0 && !accountId) setAccountId(aJson.data[0].id);
      }
      if (cJson.success) {
        setCategories(cJson.data);
        if (cJson.data.length > 0 && !categoryId) setCategoryId(cJson.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, accountId, categoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          description: desc,
          amount: parseFloat(amount),
          type,
          frequency,
          start_date: startDate,
          account_id: accountId,
          category_id: categoryId
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Recurring transaction schedule created');
      setModalOpen(false);
      setDesc('');
      setAmount('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleTriggerDue = async () => {
    try {
      const res = await fetch(`/api/recurring?familyId=${familyId}`);
      const json = await res.json();
      if (json.success) {
        setRecurring(json.data);
        showToast('Due recurring transactions processed and ledger updated');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove recurring transaction schedule?')) return;
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Recurring schedule removed');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Recurring Transactions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automate routine salaries, recurring utilities, rents, and allowances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerDue}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Play className="h-4 w-4 text-emerald-500" />
            <span>Process Due Items</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>New Recurring Item</span>
          </button>
        </div>
      </div>

      {/* Recurring Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recurring.map((item) => {
          const isIncome = item.type === 'income';

          return (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.description}</h3>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {item.frequency} schedule
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5">
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                      {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Info block */}
                <div className="mt-4 rounded-2xl bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account:</span>
                    <span className="font-medium">{item.account_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Next Occurrence:</span>
                    <span className="font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {item.next_occurrence}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  Auto-create {item.auto_create ? 'Enabled' : 'Off'}
                </span>
                <span className="text-slate-400 text-[11px] capitalize">{item.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Recurring Item</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`rounded-lg py-1.5 font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900' : 'text-slate-500'}`}
                >
                  Recurring Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`rounded-lg py-1.5 font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900' : 'text-slate-500'}`}
                >
                  Recurring Income
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Salary, Rent, Allowance"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (2 Weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account *</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Set Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
