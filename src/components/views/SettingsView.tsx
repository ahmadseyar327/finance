'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  Database,
  Shield,
  RefreshCw,
  Coins,
  History,
  CheckCircle2,
  AlertTriangle,
  User,
  Sparkles
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export const SettingsView: React.FC = () => {
  const {
    familyId,
    familyName,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    showToast,
    triggerRefresh
  } = useApp();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [reseeding, setReseeding] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/audit-logs?familyId=${familyId}&limit=20`);
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleReseed = async () => {
    if (!confirm('Re-seed will restore the comprehensive demo dataset (Henderson family, accounts, ledger, goals, loans). Continue?')) return;
    setReseeding(true);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Comprehensive demo dataset refreshed successfully!');
      triggerRefresh();
      fetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Re-seed failed';
      showToast(msg, 'error');
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          System Configuration & Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Household parameters, multi-currency baseline, security, and ledger audit logs
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings Panels (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Household Info */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Household Identity
            </h2>
            <p className="text-xs text-slate-400 mb-4">Core family profile and multi-member permissions</p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Household Title</label>
                <input
                  type="text"
                  disabled
                  value={familyName}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Theme Preference</label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={toggleTheme}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'} (Click to Toggle)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Database & Demo Data Tools */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              Dataset & Reset Management
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Reset database and restore rich realistic demo financial data
            </p>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Restore Full Realistic Demo Dataset
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Populates accounts, 4 family members, categories, historical ledger, 4 savings goals, debts, and subscriptions.
                </p>
              </div>

              <button
                disabled={reseeding}
                onClick={handleReseed}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 shrink-0"
              >
                {reseeding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Reset & Re-seed Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Stream (1 col) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              Audit Event Log
            </h2>
            <button
              onClick={fetchLogs}
              className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Refresh
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-4">Immutable audit trail of recent modifications</p>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 uppercase">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">{log.entity}</span>
                </div>
                {log.details && (
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate">
                    {log.details}
                  </p>
                )}
                <div className="mt-1 text-[10px] text-slate-400">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
