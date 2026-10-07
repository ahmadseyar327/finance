'use client';

import React from 'react';
import { useApp, NavSection } from '@/context/AppContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  PieChart,
  PiggyBank,
  HandCoins,
  Repeat,
  CreditCard,
  Building2,
  Scale,
  Users,
  Tags,
  BarChart3,
  Calendar,
  Bell,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  X,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile, unreadCount = 0 }) => {
  const { activeSection, setActiveSection, familyName, logout } = useApp();

  const navItems: { id: NavSection; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Accounts', icon: Landmark },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'savings_goals', label: 'Savings Goals', icon: PiggyBank },
    { id: 'debts', label: 'Debts & Loans', icon: HandCoins },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'assets', label: 'Assets', icon: Building2 },
    { id: 'liabilities', label: 'Liabilities', icon: Scale },
    { id: 'family_members', label: 'Family Members', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'calendar', label: 'Financial Calendar', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleSelect = (id: NavSection) => {
    setActiveSection(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">FamilyFinance</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">PRO</span>
              </div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{familyName}</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3.5 py-4">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Household Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isActive ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="h-4 w-4 text-white/80" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Family Status & Sign Out */}
        <div className="border-t border-slate-100 p-3.5 space-y-2 dark:border-slate-800/80">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/30 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between text-xs font-medium text-indigo-900 dark:text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Miakhil Vault
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Encrypted</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Household Double-Entry Ledger Active.
            </p>
          </div>

          <button
            onClick={() => {
              onCloseMobile();
              logout();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Lock / Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
