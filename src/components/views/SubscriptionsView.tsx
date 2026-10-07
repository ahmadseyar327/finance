'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CreditCard,
  Plus,
  Calendar,
  Trash2,
  Tv,
  Music,
  Cloud,
  Wifi,
  Package,
  Activity,
  X
} from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  category_name?: string;
  account_name?: string;
  amount: number;
  billing_frequency: 'monthly' | 'yearly' | 'quarterly';
  next_billing_date: string;
  status: 'active' | 'cancelled' | 'paused';
  monthly_cost: number;
  yearly_cost: number;
  days_until_renewal: number;
  icon: string;
}

interface AccountOption {
  id: string;
  name: string;
}

export const SubscriptionsView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [totalYearly, setTotalYearly] = useState(0);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'quarterly'>('monthly');
  const [nextDate, setNextDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/subscriptions?familyId=${familyId}`),
        fetch(`/api/accounts?familyId=${familyId}`)
      ]);
      const sJson = await sRes.json();
      const aJson = await aRes.json();
      if (sJson.success) {
        setSubscriptions(sJson.data.subscriptions);
        setTotalMonthly(sJson.data.totalMonthlyCost);
        setTotalYearly(sJson.data.totalYearlyCost);
      }
      if (aJson.success) {
        setAccounts(aJson.data);
        if (aJson.data.length > 0 && !accountId) setAccountId(aJson.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name,
          account_id: accountId,
          amount: parseFloat(amount),
          billing_frequency: frequency,
          next_billing_date: nextDate
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Subscription "${name}" logged`);
      setModalOpen(false);
      setName('');
      setAmount('');
      setNextDate('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleDeleteSub = async (id: string, subName: string) => {
    if (!confirm(`Remove subscription "${subName}"?`)) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Subscription removed');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  const getSubIcon = (iconName: string) => {
    switch (iconName) {
      case 'tv': return Tv;
      case 'music': return Music;
      case 'cloud': return Cloud;
      case 'wifi': return Wifi;
      case 'package': return Package;
      case 'activity': return Activity;
      default: return CreditCard;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Recurring Subscriptions & Services
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor streaming, SaaS, utilities, and memberships to eliminate ghost charges
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>New Subscription</span>
        </button>
      </div>

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Monthly Burn Rate</span>
          <div className="mt-1 text-2xl font-black text-rose-500">{formatCurrency(totalMonthly)}</div>
          <p className="mt-0.5 text-xs text-slate-500">Fixed monthly subscription commitments</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Annual Projected Cost</span>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalYearly)}</div>
          <p className="mt-0.5 text-xs text-slate-500">Yearly aggregate subscription drain</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Active Services</span>
          <div className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {subscriptions.filter((s) => s.status === 'active').length}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Tracked recurring billing cycles</p>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((s) => {
          const Icon = getSubIcon(s.icon);
          const isSoon = s.days_until_renewal <= 5 && s.days_until_renewal >= 0;

          return (
            <div
              key={s.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        {s.account_name} • <span className="capitalize">{s.billing_frequency}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSub(s.id, s.name)}
                    className="p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(s.amount)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/{s.billing_frequency === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>

                  {s.billing_frequency === 'yearly' && (
                    <span className="text-xs font-semibold text-slate-400">
                      ~{formatCurrency(s.monthly_cost)}/mo
                    </span>
                  )}
                </div>

                {/* Renewal Alert */}
                <div className="mt-4 rounded-2xl bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Renewal: {s.next_billing_date}
                  </span>

                  <span
                    className={`font-semibold rounded-md px-1.5 py-0.5 ${
                      isSoon
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.days_until_renewal >= 0
                      ? `in ${s.days_until_renewal} days`
                      : 'due recently'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  {s.status}
                </span>
                <span className="text-slate-400 text-[11px]">Auto-debit active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Subscription Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Track New Subscription</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSub} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Service / App Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Netflix, Spotify, Gym, Cloud Storage"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 19.99"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Next Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Debited Account *</label>
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
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
