'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  HandCoins,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Landmark,
  Percent,
  X,
  CreditCard
} from 'lucide-react';

interface Debt {
  id: string;
  name: string;
  type: string;
  creditor_debtor: string;
  original_amount: number;
  remaining_balance: number;
  interest_rate: number;
  start_date: string;
  due_date: string;
  installment_amount: number;
  payment_frequency: string;
  total_installments: number;
  remaining_installments: number;
  status: 'active' | 'paid_off';
  paid_amount: number;
  payoff_progress: number;
}

interface AccountOption {
  id: string;
  name: string;
  current_balance: number;
}

export const DebtsView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New Debt Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank_loan');
  const [creditor, setCreditor] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('36');

  // Payment Modal
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`/api/debts?familyId=${familyId}`),
        fetch(`/api/accounts?familyId=${familyId}`)
      ]);
      const dJson = await dRes.json();
      const aJson = await aRes.json();
      if (dJson.success) setDebts(dJson.data);
      if (aJson.success) {
        setAccounts(aJson.data);
        if (aJson.data.length > 0 && !payAccount) setPayAccount(aJson.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, payAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name,
          type,
          creditor_debtor: creditor,
          original_amount: parseFloat(originalAmount),
          interest_rate: interestRate ? parseFloat(interestRate) : 0,
          start_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          installment_amount: installmentAmount ? parseFloat(installmentAmount) : 0,
          total_installments: parseInt(totalInstallments || '12')
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Debt liability "${name}" logged`);
      setModalOpen(false);
      setName('');
      setCreditor('');
      setOriginalAmount('');
      setDueDate('');
      setInstallmentAmount('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDebt) return;

    try {
      const res = await fetch(`/api/debts/${paymentDebt.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: payAccount,
          amount: parseFloat(payAmount),
          payment_date: new Date().toISOString().split('T')[0],
          notes: `Installment for ${paymentDebt.name}`
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Repayment of ${formatCurrency(parseFloat(payAmount))} logged!`);
      setPaymentDebt(null);
      setPayAmount('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      showToast(msg, 'error');
    }
  };

  const handleDeleteDebt = async (id: string, debtName: string) => {
    if (!confirm(`Are you sure you want to remove debt record "${debtName}"?`)) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Debt record removed');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  const totalDebtBalance = debts.reduce((sum, d) => sum + d.remaining_balance, 0);
  const totalOriginalDebt = debts.reduce((sum, d) => sum + d.original_amount, 0);
  const totalPaidDebt = Math.max(0, totalOriginalDebt - totalDebtBalance);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Debts, Mortgages & Loans
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total remaining liabilities: {formatCurrency(totalDebtBalance)} • Total repaid: {formatCurrency(totalPaidDebt)}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Record Loan / Liability</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Remaining Balance</span>
          <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(totalDebtBalance)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Active principal balance</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Principal Paid</span>
          <div className="mt-1 text-2xl font-black text-emerald-500">
            {formatCurrency(totalPaidDebt)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Paid off lifetime</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Active Debt Accounts</span>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {debts.filter((d) => d.status === 'active').length}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Open financing arrangements</p>
        </div>
      </div>

      {/* Debts Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {debts.map((d) => {
          const isPaid = d.status === 'paid_off';

          return (
            <div
              key={d.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{d.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        {d.creditor_debtor} • {d.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDebt(d.id, d.name)}
                    className="p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Visual */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {formatCurrency(d.remaining_balance)}
                    </span>
                    <span className="text-slate-400 font-medium">
                      of {formatCurrency(d.original_amount)}
                    </span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, d.payoff_progress)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{d.payoff_progress}% Principal Paid</span>
                    <span>{d.remaining_installments} payments left</span>
                  </div>
                </div>

                {/* Detail Box */}
                <div className="mt-5 space-y-1.5 rounded-2xl bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Interest APR:</span>
                    <span className="font-bold">{d.interest_rate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Installment:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(d.installment_amount)} / {d.payment_frequency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Maturity Date:</span>
                    <span className="font-medium">{d.due_date}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  disabled={isPaid}
                  onClick={() => {
                    setPaymentDebt(d);
                    setPayAmount(d.installment_amount > 0 ? d.installment_amount.toString() : '');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-colors disabled:opacity-50"
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  <span>{isPaid ? 'Loan Paid in Full' : 'Record Repayment'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repayment Modal */}
      {paymentDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setPaymentDebt(null)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Record Payment for {paymentDebt.name}
              </h3>
              <button onClick={() => setPaymentDebt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Account (Debit) *
                </label>
                <select
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
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
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentDebt(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-amber-500"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Debt Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Loan / Liability</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Loan / Liability Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Home Mortgage, Audi Car Loan"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Debt Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="bank_loan">Bank Auto / Personal Loan</option>
                    <option value="mortgage">Mortgage Loan</option>
                    <option value="credit_card">Credit Card Debt</option>
                    <option value="borrowed_from_family">Family Borrowed Loan</option>
                    <option value="lent_to_other">Money Lent to Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Creditor / Lender *</label>
                  <input
                    type="text"
                    required
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    placeholder="e.g. Wells Fargo, Chase"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Original Principal ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Interest Rate (% APR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Installment ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="e.g. 520.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due / Maturity Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
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
                  Record Liability
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
