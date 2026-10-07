'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Landmark,
  Wallet,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Plus,
  ArrowLeftRight,
  ShieldCheck,
  Building,
  MoreVertical,
  Trash2,
  X
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string;
  account_number_mask?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  credit_limit?: number;
  color: string;
  icon: string;
}

export const AccountsView: React.FC = () => {
  const { familyId, formatCurrency, openQuickAdd, refreshKey, triggerRefresh, showToast } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // New Account Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [mask, setMask] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts?familyId=${familyId}`);
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, refreshKey]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name,
          type,
          institution: institution || 'Personal',
          initial_balance: parseFloat(initialBalance || '0'),
          credit_limit: creditLimit ? parseFloat(creditLimit) : 0,
          account_number_mask: mask || undefined,
          color
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Account "${name}" created`);
      setModalOpen(false);
      setName('');
      setInitialBalance('');
      setCreditLimit('');
      setInstitution('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account';
      showToast(msg, 'error');
    }
  };

  const handleDeleteAccount = async (id: string, accName: string) => {
    if (!confirm(`Are you sure you want to remove or archive account "${accName}"?`)) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(json.message || 'Account removed successfully');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  // Aggregates
  const totalLiquid = accounts
    .filter((a) => a.type !== 'credit_card')
    .reduce((sum, a) => sum + a.current_balance, 0);

  const totalCreditDebt = accounts
    .filter((a) => a.type === 'credit_card')
    .reduce((sum, a) => sum + (a.current_balance > 0 ? a.current_balance : 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Accounts & Cash Wallets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage depository checking, savings, revolving cards, and cash stores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickAdd('transfer')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Transfer Funds</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Liquid Depository</span>
            <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalLiquid)}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Checking, savings, cash wallets, investments</p>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
            <Landmark className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Card Balance Due</span>
            <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(totalCreditDebt)}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Total outstanding balance across credit lines</p>
          </div>
          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => {
          let Icon = Landmark;
          if (acc.type === 'savings') Icon = PiggyBank;
          else if (acc.type === 'credit_card') Icon = CreditCard;
          else if (acc.type === 'cash') Icon = Wallet;
          else if (acc.type === 'investment') Icon = TrendingUp;

          const isCard = acc.type === 'credit_card';

          return (
            <div
              key={acc.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm"
                      style={{ backgroundColor: acc.color || '#3B82F6' }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{acc.name}</h3>
                      <p className="text-xs text-slate-400">
                        {acc.institution} {acc.account_number_mask ? `• ${acc.account_number_mask}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                    title="Remove or Archive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">
                    {isCard ? 'Current Balance' : 'Current Balance'}
                  </span>
                  <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(acc.current_balance)}
                  </div>
                  {isCard && acc.credit_limit ? (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Limit: {formatCurrency(acc.credit_limit)}</span>
                      <span>Available: {formatCurrency(Math.max(0, acc.credit_limit - acc.current_balance))}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-slate-400">
                      Initial: {formatCurrency(acc.initial_balance)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
                  {acc.type.replace('_', ' ')}
                </span>
                <button
                  onClick={() => openQuickAdd('transfer')}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Transfer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Account</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Nickname *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chase Main Checking, Ally Emergency Fund"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="bank">Checking Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash Wallet</option>
                    <option value="investment">Investment Portfolio</option>
                    <option value="other">Other Asset Account</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Financial Institution</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Chase, Vanguard"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Balance ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {type === 'credit_card' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Credit Limit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="10000.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mask (Last 4)</label>
                    <input
                      type="text"
                      value={mask}
                      onChange={(e) => setMask(e.target.value)}
                      placeholder="•••• 1234"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge Color</label>
                <div className="flex items-center gap-2">
                  {['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#0EA5E9', '#EC4899', '#6B7280'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-xl transition-transform ${color === c ? 'scale-110 ring-2 ring-indigo-500' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
