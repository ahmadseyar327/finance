'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp, NavSection } from '@/context/AppContext';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Calendar,
  CreditCard,
  PiggyBank,
  Sparkles,
  Trash2,
  ExternalLink
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

export const NotificationDrawer: React.FC = () => {
  const { notificationDrawerOpen, setNotificationDrawerOpen, setActiveSection, familyId, refreshKey, showToast } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?familyId=${familyId}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    if (notificationDrawerOpen) {
      fetchNotifications();
    }
  }, [notificationDrawerOpen, refreshKey, fetchNotifications]);

  if (!notificationDrawerOpen) return null;

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', family_id: familyId })
      });
      fetchNotifications();
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigate = (link?: string) => {
    if (!link) return;
    setNotificationDrawerOpen(false);
    const clean = link.replace('/', '') as NavSection;
    if (clean) setActiveSection(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setNotificationDrawerOpen(false)}
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4.5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Household Alerts</h2>
              <p className="text-[11px] text-slate-400">Real-time financial activity & updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={() => setNotificationDrawerOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 && !loading && (
            <div className="py-20 text-center text-xs text-slate-400">
              <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2 opacity-60" />
              All caught up! No active financial alerts.
            </div>
          )}

          {notifications.map((n) => {
            let Icon = Sparkles;
            let iconColor = 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50';

            if (n.type === 'budget_alert') {
              Icon = AlertTriangle;
              iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-950/50';
            } else if (n.type === 'low_balance') {
              Icon = AlertTriangle;
              iconColor = 'text-rose-500 bg-rose-50 dark:bg-rose-950/50';
            } else if (n.type === 'subscription_renewal') {
              Icon = CreditCard;
              iconColor = 'text-purple-500 bg-purple-50 dark:bg-purple-950/50';
            } else if (n.type === 'bill_due') {
              Icon = Calendar;
              iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-950/50';
            } else if (n.type === 'savings_milestone') {
              Icon = PiggyBank;
              iconColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';
            }

            return (
              <div
                key={n.id}
                className={`relative rounded-2xl border p-3.5 transition-all ${
                  n.is_read
                    ? 'border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-900/40 text-slate-500'
                    : 'border-indigo-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/90 text-slate-900 dark:text-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      {n.link ? (
                        <button
                          onClick={() => handleNavigate(n.link)}
                          className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          <span>Review</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : <span />}

                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
