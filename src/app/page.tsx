'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useApp, NavSection } from '@/context/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { LoginView } from '@/components/LoginView';
import { ShieldCheck } from 'lucide-react';

// Lazy-load all views — only the active view's JS is downloaded
const DashboardView = lazy(() =>
  import('@/components/views/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const TransactionsView = lazy(() =>
  import('@/components/views/TransactionsView').then((m) => ({ default: m.TransactionsView }))
);
const AccountsView = lazy(() =>
  import('@/components/views/AccountsView').then((m) => ({ default: m.AccountsView }))
);
const BudgetsView = lazy(() =>
  import('@/components/views/BudgetsView').then((m) => ({ default: m.BudgetsView }))
);
const SavingsGoalsView = lazy(() =>
  import('@/components/views/SavingsGoalsView').then((m) => ({ default: m.SavingsGoalsView }))
);
const DebtsView = lazy(() =>
  import('@/components/views/DebtsView').then((m) => ({ default: m.DebtsView }))
);
const RecurringView = lazy(() =>
  import('@/components/views/RecurringView').then((m) => ({ default: m.RecurringView }))
);
const SubscriptionsView = lazy(() =>
  import('@/components/views/SubscriptionsView').then((m) => ({ default: m.SubscriptionsView }))
);
const AssetsLiabilitiesView = lazy(() =>
  import('@/components/views/AssetsLiabilitiesView').then((m) => ({ default: m.AssetsLiabilitiesView }))
);
const FamilyMembersView = lazy(() =>
  import('@/components/views/FamilyMembersView').then((m) => ({ default: m.FamilyMembersView }))
);
const CategoriesView = lazy(() =>
  import('@/components/views/CategoriesView').then((m) => ({ default: m.CategoriesView }))
);
const ReportsView = lazy(() =>
  import('@/components/views/ReportsView').then((m) => ({ default: m.ReportsView }))
);
const FinancialCalendarView = lazy(() =>
  import('@/components/views/FinancialCalendarView').then((m) => ({ default: m.FinancialCalendarView }))
);
const NotificationsView = lazy(() =>
  import('@/components/views/NotificationsView').then((m) => ({ default: m.NotificationsView }))
);
const SettingsView = lazy(() =>
  import('@/components/views/SettingsView').then((m) => ({ default: m.SettingsView }))
);

function ViewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function renderView(section: NavSection) {
  switch (section) {
    case 'dashboard':       return <DashboardView />;
    case 'transactions':    return <TransactionsView />;
    case 'accounts':        return <AccountsView />;
    case 'budgets':         return <BudgetsView />;
    case 'savings_goals':   return <SavingsGoalsView />;
    case 'debts':           return <DebtsView />;
    case 'recurring':       return <RecurringView />;
    case 'subscriptions':   return <SubscriptionsView />;
    case 'assets':          return <AssetsLiabilitiesView />;
    case 'liabilities':     return <AssetsLiabilitiesView />;
    case 'family_members':  return <FamilyMembersView />;
    case 'categories':      return <CategoriesView />;
    case 'reports':         return <ReportsView />;
    case 'calendar':        return <FinancialCalendarView />;
    case 'notifications':   return <NotificationsView />;
    case 'settings':        return <SettingsView />;
    default:                return <DashboardView />;
  }
}

export default function HomePage() {
  const { activeSection, familyId, refreshKey, isAuthenticated, authLoading, loginSuccess } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`/api/notifications?familyId=${familyId}&limit=1`);
      const json = await res.json();
      if (json.success) setUnreadCount(json.unreadCount ?? 0);
    } catch { /* silent */ }
  }, [familyId, isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, refreshKey]);

  // Loading state while verifying cookie session
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30 animate-pulse">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <div className="text-base font-bold text-white tracking-wide">Miakhil Family Finance</div>
            <div className="text-xs text-slate-500">Securing private household treasury...</div>
          </div>
        </div>
      </div>
    );
  }

  // Authentication barrier: require username 'miakhilfamily' & password 'SMH07+++'
  if (!isAuthenticated) {
    return <LoginView onSuccess={loginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Navbar */}
        <Navbar
          onOpenMobile={() => setMobileSidebarOpen(true)}
          unreadCount={unreadCount}
        />

        {/* Dynamic Section View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Suspense fallback={<ViewSkeleton />}>
            {renderView(activeSection)}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
