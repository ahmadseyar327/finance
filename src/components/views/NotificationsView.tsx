'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Calendar,
  CreditCard,
  PiggyBank,
  Sparkles,
  Trash2,
  ExternalLink,
  Filter
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: number;
  created_at: string;
}

export const NotificationsView: React.FC = () => {
  const { familyId, refreshKey, triggerRefresh, showToast, setActiveSection } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?familyId=${familyId}&limit=50`);
      const json = await res.json();
      if (json.success) setNotifications(json.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, refreshKey]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', family_id: familyId })
      });
      fetchNotifications();
      showToast('All notifications marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? n.is_read === 0 : true));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time automated warnings for budget thresholds, upcoming dues, and savings milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unread toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Unread Only
            </button>
          </div>

          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <CheckCheck className="h-4 w-4 text-indigo-500" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            No notifications in this view.
          </div>
        ) : (
          filtered.map((n) => {
            let Icon = Sparkles;
            let iconColor = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400';

            if (n.type === 'budget_alert') {
              Icon = AlertTriangle;
              iconColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400';
            } else if (n.type === 'low_balance') {
              Icon = AlertTriangle;
              iconColor = 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400';
            } else if (n.type === 'subscription_renewal') {
              Icon = CreditCard;
              iconColor = 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400';
            } else if (n.type === 'bill_due') {
              Icon = Calendar;
              iconColor = 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400';
            } else if (n.type === 'savings_milestone') {
              Icon = PiggyBank;
              iconColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400';
            }

            return (
              <div
                key={n.id}
                className={`flex items-start justify-between rounded-2xl border p-4 transition-all ${
                  n.is_read
                    ? 'border-slate-100 bg-slate-50/40 dark:border-slate-800/60 dark:bg-slate-900/40'
                    : 'border-indigo-100 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-800/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</h4>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="rounded-xl border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
