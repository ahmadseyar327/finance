'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';

export type NavSection =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'savings_goals'
  | 'debts'
  | 'recurring'
  | 'subscriptions'
  | 'assets'
  | 'liabilities'
  | 'family_members'
  | 'categories'
  | 'reports'
  | 'calendar'
  | 'notifications'
  | 'settings';

export type QuickAddType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'debt'
  | 'goal'
  | 'asset'
  | 'recurring'
  | 'subscription'
  | null;

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export interface UserSession {
  username: string;
  name: string;
  role: string;
}

interface AppContextType {
  activeSection: NavSection;
  setActiveSection: (sec: NavSection) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currency: string;
  setCurrency: (c: string) => void;
  formatCurrency: (amount: number) => string;
  familyId: string;
  familyName: string;
  activeMemberId: string | 'all';
  setActiveMemberId: (id: string | 'all') => void;
  quickAddOpen: boolean;
  quickAddType: QuickAddType;
  openQuickAdd: (type?: QuickAddType) => void;
  closeQuickAdd: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  notificationDrawerOpen: boolean;
  setNotificationDrawerOpen: (open: boolean) => void;
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type'], title?: string) => void;
  dismissToast: (id: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  // Auth state
  isAuthenticated: boolean;
  authLoading: boolean;
  currentUser: UserSession | null;
  loginSuccess: (user: UserSession) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Stable currency formatter instances — created once per currency change
const createFormatter = (currency: string) => {
  const sign = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return (amount: number): string => {
    const num = amount || 0;
    return `${num < 0 ? '-' : ''}${sign}${Math.abs(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currency, setCurrency] = useState('USD');
  const [activeMemberId, setActiveMemberId] = useState<string | 'all'>('all');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<QuickAddType>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Family identifiers
  const familyId = 'fam-demo-001';
  const familyName = 'Miakhil Family';

  // Check existing session on boot
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch {
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loginSuccess = useCallback((user: UserSession) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setAuthLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  // Sync theme with document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      // Escape closes modals
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationDrawerOpen(false);
        setQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Stable formatter — only recreated when currency changes
  const formatCurrency = useMemo(() => createFormatter(currency), [currency]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: Toast['type'] = 'success', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        const next = [...prev, { id, type, title, message }];
        return next.slice(-4);
      });
      const timer = setTimeout(() => dismissToast(id), 4500);
      toastTimers.current.set(id, timer);
    },
    [dismissToast]
  );

  const openQuickAdd = useCallback((type: QuickAddType = 'expense') => {
    setQuickAddType(type);
    setQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddOpen(false);
    setQuickAddType(null);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Memoize context value
  const value = useMemo<AppContextType>(
    () => ({
      activeSection,
      setActiveSection,
      theme,
      toggleTheme,
      currency,
      setCurrency,
      formatCurrency,
      familyId,
      familyName,
      activeMemberId,
      setActiveMemberId,
      quickAddOpen,
      quickAddType,
      openQuickAdd,
      closeQuickAdd,
      searchOpen,
      setSearchOpen,
      notificationDrawerOpen,
      setNotificationDrawerOpen,
      toasts,
      showToast,
      dismissToast,
      refreshKey,
      triggerRefresh,
      isAuthenticated,
      authLoading,
      currentUser,
      loginSuccess,
      logout,
    }),
    [
      activeSection,
      theme,
      toggleTheme,
      currency,
      formatCurrency,
      activeMemberId,
      quickAddOpen,
      quickAddType,
      openQuickAdd,
      closeQuickAdd,
      searchOpen,
      notificationDrawerOpen,
      toasts,
      showToast,
      dismissToast,
      refreshKey,
      triggerRefresh,
      isAuthenticated,
      authLoading,
      currentUser,
      loginSuccess,
      logout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
