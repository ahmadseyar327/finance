'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  PiggyBank,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles,
  X,
  Wallet
} from 'lucide-react';

interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: 'low' | 'medium' | 'high';
  linked_account_name?: string;
  monthly_target: number;
  status: 'active' | 'completed' | 'paused';
  remaining_amount: number;
  progress_percentage: number;
  months_remaining: number;
  suggested_monthly_contribution: number;
}

interface AccountOption {
  id: string;
  name: string;
  current_balance: number;
}

export const SavingsGoalsView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New Goal Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [linkedAccountId, setLinkedAccountId] = useState('');

  // Contribution Modal
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribAccount, setContribAccount] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, aRes] = await Promise.all([
        fetch(`/api/savings-goals?familyId=${familyId}`),
        fetch(`/api/accounts?familyId=${familyId}`)
      ]);
      const gJson = await gRes.json();
      const aJson = await aRes.json();
      if (gJson.success) setGoals(gJson.data);
      if (aJson.success) {
        setAccounts(aJson.data);
        if (aJson.data.length > 0) {
          if (!linkedAccountId) setLinkedAccountId(aJson.data[0].id);
          if (!contribAccount) setContribAccount(aJson.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, linkedAccountId, contribAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name,
          description: desc,
          target_amount: parseFloat(targetAmount),
          current_amount: initialAmount ? parseFloat(initialAmount) : 0,
          target_date: targetDate,
          priority,
          linked_account_id: linkedAccountId || undefined
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Savings target "${name}" created!`);
      setModalOpen(false);
      setName('');
      setDesc('');
      setTargetAmount('');
      setInitialAmount('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;

    try {
      const res = await fetch(`/api/savings-goals/${contributeGoal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: contribAccount,
          amount: parseFloat(contribAmount),
          date: new Date().toISOString().split('T')[0],
          notes: `Allocated to ${contributeGoal.name}`
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Added ${formatCurrency(parseFloat(contribAmount))} to ${contributeGoal.name}!`);
      setContributeGoal(null);
      setContribAmount('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Contribution failed';
      showToast(msg, 'error');
    }
  };

  const handleDeleteGoal = async (id: string, goalName: string) => {
    if (!confirm(`Are you sure you want to remove savings goal "${goalName}"?`)) return;
    try {
      const res = await fetch(`/api/savings-goals/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Savings goal removed');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Savings Goals & Future Reserves
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total accumulated savings: {formatCurrency(totalSaved)} of {formatCurrency(totalTarget)} target
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Grid of Goals */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => {
          const isDone = g.current_amount >= g.target_amount;

          return (
            <div
              key={g.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-6 w-6" /> : <PiggyBank className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</h3>
                      <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                        {g.description || 'Target savings reserve'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(g.id, g.name)}
                    className="p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Visual */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {formatCurrency(g.current_amount)}
                    </span>
                    <span className="text-slate-400 font-medium">
                      of {formatCurrency(g.target_amount)}
                    </span>
                  </div>

                  <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{isDone ? 'Goal Complete!' : `${formatCurrency(g.remaining_amount)} to go`}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{g.progress_percentage}%</span>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="mt-5 space-y-1.5 rounded-2xl bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Date:</span>
                    <span className="font-semibold flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {g.target_date}
                    </span>
                  </div>
                  {!isDone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Suggested / Mo:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(g.suggested_monthly_contribution)} / mo
                      </span>
                    </div>
                  )}
                  {g.linked_account_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Vault Account:</span>
                      <span className="font-medium">{g.linked_account_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setContributeGoal(g)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Allocate Funds</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocate Funds Modal */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setContributeGoal(null)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Allocate to {contributeGoal.name}
              </h3>
              <button onClick={() => setContributeGoal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordContribution} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Account (Debit) *
                </label>
                <select
                  value={contribAccount}
                  onChange={(e) => setContribAccount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (${a.current_balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contribution Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Goal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Savings Goal</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Vacation, Emergency Fund"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. 6 months living expense cushion"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 15000.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Starting Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Date *</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Linked Vault Account</label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">(None)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (${a.current_balance.toFixed(2)})
                    </option>
                  ))}
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
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
