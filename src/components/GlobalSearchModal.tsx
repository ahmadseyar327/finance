'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp, NavSection } from '@/context/AppContext';
import { Search, X, ArrowRight, Loader2, FileText } from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: 'transaction' | 'account' | 'category' | 'member' | 'goal' | 'debt' | 'asset' | 'subscription';
  title: string;
  subtitle: string;
  url: string;
  amount?: number;
  badge?: string;
}

export const GlobalSearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, setActiveSection, formatCurrency } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!searchOpen) return null;

  const handleSelectResult = (item: SearchResultItem) => {
    setSearchOpen(false);
    if (item.type === 'transaction') setActiveSection('transactions');
    else if (item.type === 'account') setActiveSection('accounts');
    else if (item.type === 'member') setActiveSection('family_members');
    else if (item.type === 'goal') setActiveSection('savings_goals');
    else if (item.type === 'debt') setActiveSection('debts');
    else if (item.type === 'subscription') setActiveSection('subscriptions');
    else if (item.type === 'asset') setActiveSection('assets');
    else if (item.type === 'category') setActiveSection('categories');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setSearchOpen(false)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, accounts, loans, savings goals, assets..."
            className="w-full bg-transparent px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
          {query && !loading && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-3">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-slate-400">
              <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              No financial records match &quot;{query}&quot;.
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type at least 2 characters to search across household ledgers, accounts, and goals.
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelectResult(item)}
                  className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      {item.badge || item.type}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.amount !== undefined && (
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
          <span>Navigate with mouse or tap</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800">
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  );
};
