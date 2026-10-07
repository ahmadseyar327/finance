'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit,
  TrendingUp,
  X,
  Sparkles
} from 'lucide-react';

interface Budget {
  id: string;
  category_id?: string;
  family_member_id?: string;
  period_type: string;
  amount: number;
  alert_threshold: number;
  category_name?: string;
  category_color?: string;
  member_name?: string;
  spent: number;
  remaining: number;
  percentage_used: number;
  status: 'healthy' | 'near_limit' | 'exceeded';
  forecasted_spending: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

export const BudgetsView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [periodType, setPeriodType] = useState('monthly');
  const [threshold, setThreshold] = useState('0.85');

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/budgets?familyId=${familyId}`),
        fetch(`/api/categories?familyId=${familyId}&type=expense&flat=true`)
      ]);
      const bJson = await bRes.json();
      const cJson = await cRes.json();
      if (bJson.success) setBudgets(bJson.data);
      if (cJson.success) {
        setCategories(cJson.data);
        if (cJson.data.length > 0 && !categoryId) setCategoryId(cJson.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, categoryId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets, refreshKey]);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          category_id: categoryId || undefined,
          period_type: periodType,
          amount: parseFloat(amount),
          alert_threshold: parseFloat(threshold)
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Budget configured successfully');
      setModalOpen(false);
      setAmount('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget goal?')) return;
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Budget deleted');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Household Budgets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set spending caps per category with intelligent run-rate alerts
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>New Budget Limit</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Monthly Budget</span>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalBudget)}</div>
          <p className="mt-0.5 text-xs text-slate-500">Aggregated spending ceiling</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Spent This Period</span>
          <div className="mt-1 text-2xl font-black text-rose-500">{formatCurrency(totalSpent)}</div>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of total limit` : '0%'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Remaining Cushion</span>
          <div className="mt-1 text-2xl font-black text-emerald-500">{formatCurrency(totalRemaining)}</div>
          <p className="mt-0.5 text-xs text-slate-500">Available unallocated funds</p>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((b) => {
          const isExceeded = b.status === 'exceeded';
          const isNear = b.status === 'near_limit';

          return (
            <div
              key={b.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: b.category_color || '#6366F1' }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {b.category_name || 'Category'}
                      </h3>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {b.period_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isExceeded
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : isNear
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExceeded ? 'Exceeded' : isNear ? 'Near Limit' : 'Healthy'}
                    </span>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="p-1 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(b.spent)} <span className="text-slate-400 font-normal">spent</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(b.amount)}
                    </span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentage_used)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{isExceeded ? 'Over budget by ' + formatCurrency(Math.abs(b.remaining)) : formatCurrency(b.remaining) + ' remaining'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{b.percentage_used}%</span>
                  </div>
                </div>
              </div>

              {/* Forecast run-rate */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-indigo-500" />
                  Forecasted end of month:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(b.forecasted_spending)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Budget Limit</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Limit Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1000.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Period</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Warning Alert Threshold</label>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="0.75">Warn at 75% limit reached</option>
                  <option value="0.80">Warn at 80% limit reached</option>
                  <option value="0.85">Warn at 85% limit reached (Recommended)</option>
                  <option value="0.90">Warn at 90% limit reached</option>
                </select>
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
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
