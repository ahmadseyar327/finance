'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers
} from 'lucide-react';

interface ReportData {
  incomeBreakdown: { id: string; name: string; color: string; amount: number; percentage: number; transactionCount: number }[];
  expenseBreakdown: { id: string; name: string; color: string; amount: number; percentage: number; transactionCount: number }[];
  cashFlow: { date: string; label: string; income: number; expenses: number; net: number }[];
  netWorth?: { totalAssets: number; totalLiabilities: number; netWorth: number };
}

export const ReportsView: React.FC = () => {
  const { familyId, formatCurrency, showToast } = useApp();
  const [reportType, setReportType] = useState<'expense' | 'income' | 'cash_flow' | 'net_worth'>('expense');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    setStartDate(`${now.getFullYear()}-01-01`);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?familyId=${familyId}&startDate=${startDate}&endDate=${endDate}&type=all`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;
    const currentList = reportType === 'income' ? data.incomeBreakdown : data.expenseBreakdown;
    const headers = ['Category', 'Amount', 'Percentage', 'Transactions'];
    const rows = currentList.map((c) => [`"${c.name}"`, c.amount, `${c.percentage}%`, c.transactionCount]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `financial_report_${reportType}.csv`;
    a.click();
    showToast('Report exported successfully');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Financial Analytics & Reporting
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exportable annual reports, spending categorization, and cash flow trends
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Report selection buttons */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
          {[
            { id: 'expense', label: 'Expense Breakdown' },
            { id: 'income', label: 'Income Sources' },
            { id: 'cash_flow', label: 'Cash Flow Dynamics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as typeof reportType)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                reportType === tab.id
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-slate-400">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Report Content */}
      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Table (2 cols) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              {reportType === 'income' ? 'Income Stream Analysis' : reportType === 'expense' ? 'Categorized Expense Auditing' : 'Periodic Cash Flow Statement'}
            </h2>

            {reportType !== 'cash_flow' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 font-semibold">
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Transaction Count</th>
                      <th className="py-2.5 px-3">Percentage Share</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(reportType === 'income' ? data.incomeBreakdown : data.expenseBreakdown).map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="font-semibold text-slate-900 dark:text-white">{cat.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{cat.transactionCount} entries</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                              />
                            </div>
                            <span className="text-slate-400">{cat.percentage}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(cat.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                {data.cashFlow.map((cf, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800/80">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">{cf.label} ({cf.date})</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{formatCurrency(cf.income)}</span>
                      <span className="text-rose-500 font-bold">-{formatCurrency(cf.expenses)}</span>
                      <span className={`font-black ${cf.net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                        Net: {formatCurrency(cf.net)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual Progress Breakdown (1 col) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Executive Synthesis
              </h2>
              <p className="text-xs text-slate-400 mb-6">Proportional distribution overview</p>

              <div className="space-y-4">
                {(reportType === 'income' ? data.incomeBreakdown : data.expenseBreakdown).slice(0, 7).map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{c.percentage}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              Generated according to double-entry household accounting standards.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
