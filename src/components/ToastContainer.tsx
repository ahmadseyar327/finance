'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        let Icon = CheckCircle2;
        let borderClass = 'border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100';
        let iconColor = 'text-emerald-500';

        if (t.type === 'error') {
          Icon = AlertCircle;
          borderClass = 'border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100';
          iconColor = 'text-rose-500';
        } else if (t.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100';
          iconColor = 'text-amber-500';
        } else if (t.type === 'info') {
          Icon = Info;
          borderClass = 'border-indigo-500/30 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-100';
          iconColor = 'text-indigo-500';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5 ${borderClass}`}
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs">
              {t.title && <div className="font-semibold">{t.title}</div>}
              <div className="mt-0.5 leading-relaxed">{t.message}</div>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
