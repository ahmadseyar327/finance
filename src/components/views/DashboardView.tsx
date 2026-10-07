'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useFetch } from '@/lib/useFetch';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ArrowDownRight, ArrowUpRight,
  PiggyBank, HandCoins, Sparkles, Calendar, CheckCircle2, AlertTriangle,
  ArrowRight, Clock, RefreshCw, Plus,
} from 'lucide-react';

interface DashboardData {
  period: string; startDate: string; endDate: string;
  summary: {
    totalBalance: number; totalIncome: number; totalExpenses: number;
    netCashFlow: number; totalSavings: number; totalDebt: number;
    netWorth: number; incomeDeltaPct: number; expenseDeltaPct: number; netDeltaPct: number;
  };
  cashFlowPoints: { date: string; label: string; income: number; expenses: number; net: number }[];
  expenseCategories: { id: string; name: string; color: string; icon: string; amount: number; percentage: number; transactionCount: number }[];
  budgetOverview: {
    totalBudget: number; totalSpent: number; remaining: number; percentageUsed: number; exceedingCount: number;
    items: { id: string; category_name?: string; amount: number; spent: number; remaining: number; percentage_used: number; status: string }[];
  };
  savingsGoals: { id: string; name: string; target_amount: number; current_amount: number; progress_percentage: number; target_date: string; remaining_amount: number }[];
  upcomingPayments: { id: string; name: string; amount: number; due_date: string; payment_type: string; icon: string }[];
  recentTransactions: {
    id: string; type: string; description: string; amount: number; date: string;
    category_name?: string; account_name?: string; member_name?: string; member_color?: string;
  }[];
  financialHealth: {
    score: number; rating: string; savingsRate: number; expenseToIncomeRatio: number;
    debtToIncomeRatio: number; budgetAdherenceScore: number; emergencyFundStatus: string; insights: string[];
  };
  netWorthTrend: { month: string; assets: number; liabilities: number; netWorth: number }[];
}

type Period = '7d' | '30d' | 'month' | 'last_month' | '6m' | '12m';

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d', label: '7 Days' }, { id: '30d', label: '30 Days' },
  { id: 'month', label: 'This Month' }, { id: 'last_month', label: 'Last Month' },
  { id: '6m', label: '6 Mo' }, { id: '12m', label: '1 Year' },
];

function KpiCard({ label, value, sub, icon, iconBg, valueColor }: {
  label: string; value: string; sub: React.ReactNode;
  icon: React.ReactNode; iconBg: string; valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <div className={`rounded-lg p-1.5 ${iconBg}`}>{icon}</div>
      </div>
      <div className={`mt-2 text-lg font-bold ${valueColor || 'text-slate-900 dark:text-white'}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
}

export const DashboardView: React.FC = () => {
  const { familyId, formatCurrency, openQuickAdd, setActiveSection, refreshKey } = useApp();
  const [period, setPeriod] = useState<Period>('month');

  const url = useMemo(
    () => `/api/dashboard?familyId=${familyId}&period=${period}&_r=${refreshKey}`,
    [familyId, period, refreshKey]
  );

  const { data: raw, loading, refetch } = useFetch<{ success: boolean; data: DashboardData }>(url);
  const data = raw?.data ?? null;

  const handlePeriod = useCallback((p: Period) => setPeriod(p), []);

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[...Array(7)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, cashFlowPoints, expenseCategories, budgetOverview, savingsGoals, upcomingPayments, recentTransactions, financialHealth } = data;
  const maxFlow = Math.max(100, ...cashFlowPoints.map((p) => Math.max(p.income, p.expenses)));

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Financial Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-account family cash flow, net worth & budget telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Period selector — horizontally scrollable on mobile */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-x-auto max-w-full scrollbar-hide">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriod(p.id)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  period === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards — 2 cols mobile, 4 tablet, 7 desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Liquid Cash" value={formatCurrency(summary.totalBalance)} iconBg="bg-blue-500/10 text-blue-500" icon={<Wallet className="h-4 w-4" />} sub="All active accounts" />
        <KpiCard label="Income" value={formatCurrency(summary.totalIncome)} valueColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-500/10 text-emerald-500" icon={<ArrowUpRight className="h-4 w-4" />}
          sub={<span className={`flex items-center gap-1 font-semibold ${summary.incomeDeltaPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {summary.incomeDeltaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {summary.incomeDeltaPct}% vs prev
          </span>}
        />
        <KpiCard label="Expenses" value={formatCurrency(summary.totalExpenses)} valueColor="text-rose-600 dark:text-rose-400" iconBg="bg-rose-500/10 text-rose-500" icon={<ArrowDownRight className="h-4 w-4" />}
          sub={<span className={`flex items-center gap-1 font-semibold ${summary.expenseDeltaPct <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {summary.expenseDeltaPct <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {summary.expenseDeltaPct}% vs prev
          </span>}
        />
        <KpiCard label="Net Flow" value={formatCurrency(summary.netCashFlow)} valueColor={summary.netCashFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}
          iconBg="bg-indigo-500/10 text-indigo-500" icon={<DollarSign className="h-4 w-4" />} sub={summary.netCashFlow >= 0 ? 'Household Surplus' : 'Household Deficit'} />
        <KpiCard label="Savings" value={formatCurrency(summary.totalSavings)} valueColor="text-sky-600 dark:text-sky-400" iconBg="bg-sky-500/10 text-sky-500" icon={<PiggyBank className="h-4 w-4" />} sub="In active target funds" />
        <KpiCard label="Total Debt" value={formatCurrency(summary.totalDebt)} valueColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-500/10 text-amber-500" icon={<HandCoins className="h-4 w-4" />} sub="Loans & liabilities" />

        {/* Net Worth — special gradient card, spans 1 col on mobile but shows prominently */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/30 p-4 dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-purple-950/10 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-indigo-500 dark:text-indigo-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Worth</span>
            <div className="rounded-lg bg-indigo-600 text-white p-1.5"><Sparkles className="h-4 w-4" /></div>
          </div>
          <div className="mt-2 text-lg font-bold text-indigo-900 dark:text-indigo-100">{formatCurrency(summary.netWorth)}</div>
          <div className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">Assets − Liabilities</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Cash Flow Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cash Flow Dynamics</h2>
              <p className="text-xs text-slate-400">Income received vs. expenses paid</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Expenses
              </span>
            </div>
          </div>
          <div className="h-52 sm:h-64 w-full">
            {cashFlowPoints.length > 0 ? (
              <div className="relative h-full w-full flex items-end gap-1.5 pt-6 pb-6">
                {cashFlowPoints.map((pt, i) => {
                  const incH = maxFlow > 0 ? (pt.income / maxFlow) * 100 : 0;
                  const expH = maxFlow > 0 ? (pt.expenses / maxFlow) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0">
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] rounded-lg py-1.5 px-2.5 pointer-events-none whitespace-nowrap shadow-xl">
                        <span className="font-semibold">{pt.label}</span>
                        <span className="text-emerald-400 font-bold">+{formatCurrency(pt.income)}</span>
                        <span className="text-rose-400 font-bold">-{formatCurrency(pt.expenses)}</span>
                      </div>
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        <div className="w-1/2 max-w-[12px] rounded-t-sm bg-emerald-500 hover:bg-emerald-400 transition-all" style={{ height: `${Math.max(3, incH)}%` }} />
                        <div className="w-1/2 max-w-[12px] rounded-t-sm bg-rose-500 hover:bg-rose-400 transition-all" style={{ height: `${Math.max(3, expH)}%` }} />
                      </div>
                      <span className="mt-1.5 text-[9px] sm:text-[10px] text-slate-400 font-medium truncate w-full text-center">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No transactions in this period.</div>
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Expense Allocation</h2>
              <p className="text-xs text-slate-400">Where family funds flowed</p>
            </div>
            <button onClick={() => setActiveSection('reports')} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Details</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-56 sm:max-h-72 pr-1">
            {expenseCategories.length > 0 ? expenseCategories.slice(0, 6).map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate max-w-[120px]">{cat.name}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white ml-2 shrink-0">{cat.percentage}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            )) : <div className="py-12 text-center text-xs text-slate-400">No expense categories recorded yet.</div>}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Expenses</span>
            <span className="text-rose-500 font-bold">{formatCurrency(summary.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Budget + Savings Goals */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Budget Overview */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Budget Performance</h2>
                {budgetOverview.exceedingCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                    <AlertTriangle className="h-3 w-3" /> {budgetOverview.exceedingCount} Exceeded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Spent {formatCurrency(budgetOverview.totalSpent)} of {formatCurrency(budgetOverview.totalBudget)}</p>
            </div>
            <button onClick={() => setActiveSection('budgets')} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {budgetOverview.items.slice(0, 5).map((b) => {
              const isExceeded = b.status === 'exceeded';
              const isNear = b.status === 'near_limit';
              return (
                <div key={b.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{b.category_name || 'Budget'}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2 shrink-0">{formatCurrency(b.spent)} / {formatCurrency(b.amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${isExceeded ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, b.percentage_used)}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{isExceeded ? 'Limit exceeded' : `${formatCurrency(b.remaining)} remaining`}</span>
                    <span className={`font-semibold ${isExceeded ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-emerald-500'}`}>{b.percentage_used}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Savings Goals */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Savings Targets</h2>
              <p className="text-xs text-slate-400 mt-0.5">Family wealth milestones</p>
            </div>
            <button onClick={() => setActiveSection('savings_goals')} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {savingsGoals.slice(0, 5).map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{g.name}</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400 ml-2 shrink-0">{g.progress_percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300" style={{ width: `${Math.min(100, g.progress_percentage)}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatCurrency(g.current_amount)}</span>
                  <span>Target: {formatCurrency(g.target_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Payments + Financial Health */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Upcoming */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Payments</h2>
              <p className="text-xs text-slate-400 mt-0.5">Bills & subscriptions</p>
            </div>
            <button onClick={() => setActiveSection('calendar')} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Calendar</button>
          </div>
          <div className="space-y-2.5">
            {upcomingPayments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{p.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Due {p.due_date}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0 ml-2">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Health */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Financial Health Index</h2>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{financialHealth.rating}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Automated household balance sheet metrics</p>
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {financialHealth.score}<span className="text-xs font-medium text-slate-400">/100</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            {[
              { label: 'Savings Rate', value: `${financialHealth.savingsRate}%`, color: 'text-emerald-600 dark:text-emerald-400', sub: 'Benchmark: 20%+' },
              { label: 'Expense / Income', value: `${financialHealth.expenseToIncomeRatio}%`, color: 'text-slate-800 dark:text-slate-200', sub: 'Healthy: < 75%' },
              { label: 'Budget Score', value: `${financialHealth.budgetAdherenceScore}%`, color: 'text-indigo-600 dark:text-indigo-400', sub: 'Adherence rate' },
              { label: 'Emergency Fund', value: '', color: 'text-emerald-600 dark:text-emerald-400', sub: 'Target: 3-6 mos', extra: financialHealth.emergencyFundStatus },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">{m.label}</div>
                <div className={`mt-1 text-base font-bold truncate ${m.color}`}>{m.extra || m.value}</div>
                <div className="text-[10px] text-slate-500">{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Automated Financial Insights
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {financialHealth.insights.map((ins, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Transactions — cards on mobile, table on desktop */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest activity across family accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openQuickAdd('expense')} className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 transition-colors">
              <Plus className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Add</span>
            </button>
            <button onClick={() => setActiveSection('transactions')} className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              View All
            </button>
          </div>
        </div>

        {/* Mobile: cards */}
        <div className="sm:hidden space-y-2">
          {recentTransactions.map((tx) => {
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';
            return (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : isTransfer ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {isIncome ? <ArrowUpRight className="h-4 w-4" /> : isTransfer ? <DollarSign className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">{tx.description}</div>
                    <div className="text-[10px] text-slate-400">{tx.date} · {tx.category_name || (isTransfer ? 'Transfer' : 'Uncategorized')}</div>
                  </div>
                </div>
                <span className={`text-xs font-bold shrink-0 ml-2 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : isTransfer ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                  {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                {['Date', 'Description', 'Category', 'Account', 'Member', 'Amount'].map((h) => (
                  <th key={h} className={`pb-3 font-semibold ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 text-slate-500 whitespace-nowrap">{tx.date}</td>
                    <td className="py-3 text-slate-900 dark:text-white font-semibold max-w-[200px] truncate">{tx.description}</td>
                    <td className="py-3 text-slate-500">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tx.category_name || (isTransfer ? 'Transfer' : 'Uncategorized')}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 max-w-[120px] truncate">{tx.account_name || 'Account'}</td>
                    <td className="py-3">
                      {tx.member_name ? (
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tx.member_color || '#6366F1' }} />
                          <span>{tx.member_name}</span>
                        </span>
                      ) : <span className="text-slate-400 text-[11px]">Household</span>}
                    </td>
                    <td className="py-3 text-right font-bold whitespace-nowrap">
                      <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : isTransfer ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}>
                        {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
