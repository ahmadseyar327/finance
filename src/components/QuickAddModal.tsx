'use client';

import React, { useState, useEffect } from 'react';
import { useApp, QuickAddType } from '@/context/AppContext';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  PiggyBank,
  HandCoins,
  Building2,
  Repeat,
  Loader2
} from 'lucide-react';

interface AccountOption {
  id: string;
  name: string;
  current_balance: number;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

interface MemberOption {
  id: string;
  name: string;
}

export const QuickAddModal: React.FC = () => {
  const { quickAddOpen, quickAddType, closeQuickAdd, familyId, showToast, triggerRefresh } = useApp();

  const [activeTab, setActiveTab] = useState<QuickAddType>('expense');
  const [submitting, setSubmitting] = useState(false);

  // Reference options
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);

  // Generic form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');

  // Specialized fields
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [debtType, setDebtType] = useState('bank_loan');
  const [creditor, setCreditor] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [assetType, setAssetType] = useState('real_estate');
  const [frequency, setFrequency] = useState('monthly');

  useEffect(() => {
    if (quickAddType) setActiveTab(quickAddType);
  }, [quickAddType]);

  // Load accounts, categories, and members for dropdowns
  useEffect(() => {
    if (quickAddOpen) {
      if (!date) setDate(new Date().toISOString().split('T')[0]);
      Promise.all([
        fetch(`/api/accounts?familyId=${familyId}`).then((r) => r.json()),
        fetch(`/api/categories?familyId=${familyId}&flat=true`).then((r) => r.json()),
        fetch(`/api/family-members?familyId=${familyId}`).then((r) => r.json())
      ]).then(([accRes, catRes, memRes]) => {
        if (accRes.success && accRes.data.length > 0) {
          setAccounts(accRes.data);
          if (!accountId) setAccountId(accRes.data[0].id);
          if (accRes.data.length > 1 && !toAccountId) setToAccountId(accRes.data[1].id);
        }
        if (catRes.success && catRes.data.length > 0) {
          setCategories(catRes.data);
          if (!categoryId) setCategoryId(catRes.data[0].id);
        }
        if (memRes.success && memRes.data.length > 0) {
          setMembers(memRes.data);
          if (!memberId) setMemberId(memRes.data[0].id);
        }
      });
    }
  }, [quickAddOpen, familyId, accountId, toAccountId, categoryId, memberId]);

  if (!quickAddOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (activeTab === 'expense' || activeTab === 'income') {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            type: activeTab,
            amount: parseFloat(amount),
            date,
            description,
            account_id: accountId,
            category_id: categoryId || undefined,
            family_member_id: memberId || undefined,
            merchant: merchant || undefined,
            notes: notes || undefined
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`${activeTab === 'expense' ? 'Expense' : 'Income'} of $${amount} added successfully`);
      } else if (activeTab === 'transfer') {
        const res = await fetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            from_account_id: accountId,
            to_account_id: toAccountId,
            amount: parseFloat(amount),
            date,
            description: description || 'Account Transfer',
            family_member_id: memberId || undefined
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Transferred $${amount} successfully`);
      } else if (activeTab === 'goal') {
        const res = await fetch('/api/savings-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            name: description,
            target_amount: parseFloat(targetAmount || amount),
            target_date: targetDate || date,
            linked_account_id: accountId || undefined
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Savings goal "${description}" created`);
      } else if (activeTab === 'debt') {
        const res = await fetch('/api/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            name: description,
            type: debtType,
            creditor_debtor: creditor || 'Lender',
            original_amount: parseFloat(amount),
            due_date: date,
            installment_amount: installmentAmount ? parseFloat(installmentAmount) : 0
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Debt record "${description}" logged`);
      } else if (activeTab === 'asset') {
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            name: description,
            asset_type: assetType,
            purchase_price: parseFloat(amount),
            purchase_date: date,
            family_member_id: memberId || undefined
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Asset "${description}" added`);
      } else if (activeTab === 'recurring') {
        const res = await fetch('/api/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: familyId,
            description,
            amount: parseFloat(amount),
            type: 'expense',
            frequency,
            start_date: date,
            category_id: categoryId,
            account_id: accountId,
            family_member_id: memberId || undefined
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Recurring item "${description}" created`);
      }

      triggerRefresh();
      closeQuickAdd();
      // Reset form
      setAmount('');
      setDescription('');
      setMerchant('');
      setNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: QuickAddType; label: string; icon: React.ElementType }[] = [
    { id: 'expense', label: 'Expense', icon: ArrowDownRight },
    { id: 'income', label: 'Income', icon: ArrowUpRight },
    { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
    { id: 'goal', label: 'Goal', icon: PiggyBank },
    { id: 'debt', label: 'Debt', icon: HandCoins },
    { id: 'asset', label: 'Asset', icon: Building2 },
    { id: 'recurring', label: 'Recurring', icon: Repeat }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeQuickAdd} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick Financial Record</h2>
            <p className="text-xs text-slate-400">Instantly update your household balance sheet</p>
          </div>
          <button
            onClick={closeQuickAdd}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-6 pt-3 gap-1.5 dark:border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {activeTab === 'asset' ? 'Purchase Valuation ($)' : activeTab === 'goal' ? 'Target Amount ($)' : 'Amount ($)'} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={activeTab === 'goal' ? (targetAmount || amount) : amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (activeTab === 'goal') setTargetAmount(e.target.value);
                }}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-4 py-2.5 text-lg font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {activeTab === 'goal' ? 'Goal Name' : activeTab === 'asset' ? 'Asset Name' : 'Description / Memo'} *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                activeTab === 'goal'
                  ? 'e.g. Summer Vacation, Emergency Reserve'
                  : activeTab === 'asset'
                  ? 'e.g. 2024 Tesla Model Y, Austin Home'
                  : 'e.g. Trader Joe’s Groceries, Tech Corp Salary'
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Date & Account Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {activeTab === 'goal' ? 'Target Deadline Date' : activeTab === 'debt' ? 'Due Date' : 'Date'} *
              </label>
              <input
                type="date"
                required
                value={activeTab === 'goal' ? (targetDate || date) : date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (activeTab === 'goal') setTargetDate(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {activeTab !== 'asset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {activeTab === 'transfer' ? 'From Account' : 'Account'} *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (${a.current_balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Transfer Destination */}
          {activeTab === 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                To Account (Destination) *
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (${a.current_balance.toFixed(2)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category & Member for expense/income/recurring */}
          {(activeTab === 'expense' || activeTab === 'income' || activeTab === 'recurring') && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {categories
                    .filter((c) => (activeTab === 'income' ? c.type === 'income' : c.type === 'expense'))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Family Member</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">(None / Shared)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Recurring Frequency */}
          {activeTab === 'recurring' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          {/* Debt fields */}
          {activeTab === 'debt' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Creditor / Bank</label>
                <input
                  type="text"
                  required
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  placeholder="e.g. Chase Auto, Wells Fargo"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Installment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="e.g. 520.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Asset fields */}
          {activeTab === 'asset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Asset Type</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="real_estate">Real Estate & Property</option>
                <option value="vehicle">Automobile / Vehicle</option>
                <option value="gold_jewelry">Precious Metals & Jewelry</option>
                <option value="electronics">Electronics & Tech Gear</option>
                <option value="investments">Equity & Business Ownership</option>
                <option value="other">Other High-Value Asset</option>
              </select>
            </div>
          )}

          {/* Merchant (optional for expense) */}
          {activeTab === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Merchant / Store</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Whole Foods, Amazon, Shell"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeQuickAdd}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Financial Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
