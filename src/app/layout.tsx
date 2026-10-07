import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ToastContainer } from '@/components/ToastContainer';
import { GlobalSearchModal } from '@/components/GlobalSearchModal';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { QuickAddModal } from '@/components/QuickAddModal';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FamilyFinance PRO - Professional Family Finance Management System',
  description: 'Complete personal and family financial management platform with multi-account ledgers, budgets, savings goals, debts, and cash flow analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
        <AppProvider>
          {children}
          <QuickAddModal />
          <GlobalSearchModal />
          <NotificationDrawer />
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
