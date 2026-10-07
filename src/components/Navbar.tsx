'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp, QuickAddType } from '@/context/AppContext';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  PiggyBank,
  HandCoins,
  Building2,
  Repeat,
  ChevronDown,
  CalendarDays,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenMobile: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobile, unreadCount = 0 }) => {
  const {
    theme,
    toggleTheme,
    openQuickAdd,
    setSearchOpen,
    setNotificationDrawerOpen,
    activeMemberId,
    setActiveMemberId,
    logout
  } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const memberMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (memberMenuRef.current && !memberMenuRef.current.contains(e.target as Node)) {
        setMemberMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const quickActions: { type: QuickAddType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    { type: 'expense', label: 'Add Expense', desc: 'Money leaving an account', icon: ArrowDownRight, color: 'text-rose-500 bg-rose-500/10' },
    { type: 'income', label: 'Add Income', desc: 'Salary, consulting, dividends', icon: ArrowUpRight, color: 'text-emerald-500 bg-emerald-500/10' },
    { type: 'transfer', label: 'Transfer Money', desc: 'Move between household accounts', icon: ArrowLeftRight, color: 'text-indigo-500 bg-indigo-500/10' },
    { type: 'goal', label: 'New Savings Goal', desc: 'Target fund for vacation or asset', icon: PiggyBank, color: 'text-sky-500 bg-sky-500/10' },
    { type: 'debt', label: 'Record Debt / Loan', desc: 'Mortgage, auto loan, or borrow', icon: HandCoins, color: 'text-amber-500 bg-amber-500/10' },
    { type: 'asset', label: 'Add Household Asset', desc: 'Real estate, vehicle, gold', icon: Building2, color: 'text-purple-500 bg-purple-500/10' },
    { type: 'recurring', label: 'Set Recurring Item', desc: 'Automate salary or recurring bill', icon: Repeat, color: 'text-blue-500 bg-blue-500/10' }
  ];

  const members = [
    { id: 'all', name: 'Whole Family', color: '#6366F1' },
    { id: 'mem-1', name: 'David Henderson', color: '#3B82F6' },
    { id: 'mem-2', name: 'Sarah Henderson', color: '#EC4899' },
    { id: 'mem-3', name: 'Leo Henderson', color: '#10B981' },
    { id: 'mem-4', name: 'Maya Henderson', color: '#F59E0B' }
  ];

  const currentMember = members.find((m) => m.id === activeMemberId) || members[0];

  const [todayStr, setTodayStr] = useState('');
  useEffect(() => {
    setTodayStr(new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date()));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      {/* Left: Mobile hamburger & Global Search bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-400 transition-all hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 sm:w-64"
        >
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="hidden sm:inline truncate">Search accounts, transactions...</span>
          <kbd className="ml-auto hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Date Display */}
        <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 md:flex">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span>{todayStr}</span>
        </div>

        <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-800 md:block" />

        {/* Quick Add Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-transform active:scale-95 hover:from-indigo-500 hover:to-indigo-600"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Add</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Create Financial Record
              </div>
              <div className="space-y-1">
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.type}
                      onClick={() => {
                        setDropdownOpen(false);
                        openQuickAdd(act.type);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${act.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{act.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{act.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
        </button>

        {/* Active Member Selector */}
        <div className="relative" ref={memberMenuRef}>
          <button
            onClick={() => setMemberMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
          >
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
              style={{ backgroundColor: currentMember.color }}
            >
              {currentMember.name[0]}
            </div>
            <span className="hidden sm:inline truncate max-w-[100px]">{currentMember.name}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {memberMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                Filter Ledger by Member
              </div>
              <div className="space-y-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMemberId(m.id);
                      setMemberMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      activeMemberId === m.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name[0]}
                    </div>
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lock / Sign Out */}
        <button
          onClick={logout}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
          title="Sign Out (Lock Session)"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
};
