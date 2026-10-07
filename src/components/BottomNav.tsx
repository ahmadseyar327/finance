'use client';

import React from 'react';
import { useApp, NavSection } from '@/context/AppContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  PieChart,
  BarChart3,
  Bell,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  unreadCount?: number;
}

// The 4 most-used sections shown in the bottom bar on mobile
const PRIMARY_ITEMS: { id: NavSection; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',     label: 'Home',         icon: LayoutDashboard },
  { id: 'transactions',  label: 'Transactions', icon: ArrowLeftRight },
  { id: 'accounts',      label: 'Accounts',     icon: Landmark },
  { id: 'budgets',       label: 'Budgets',      icon: PieChart },
  { id: 'reports',       label: 'Reports',      icon: BarChart3 },
];

export const BottomNav: React.FC<BottomNavProps> = ({ unreadCount = 0 }) => {
  const { activeSection, setActiveSection, openQuickAdd, setNotificationDrawerOpen } = useApp();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden">
      {/* Glassmorphism bar */}
      <div className="flex items-center border-t border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 px-1 pb-safe-bottom">
        {/* First 2 nav items */}
        {PRIMARY_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}

        {/* Centre Quick-Add FAB */}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => openQuickAdd('expense')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Last 2 nav items */}
        {PRIMARY_ITEMS.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}

        {/* Notification bell with badge */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
            activeSection === 'notifications'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span className="leading-none">Alerts</span>
        </button>
      </div>
    </nav>
  );
};
