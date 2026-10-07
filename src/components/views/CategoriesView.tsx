'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Tags,
  Plus,
  Trash2,
  FolderTree,
  ChevronRight,
  ShieldAlert,
  X
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  type: 'expense' | 'income';
  parent_id?: string;
  icon: string;
  color: string;
  is_active: number;
  transaction_count?: number;
  subcategories?: CategoryItem[];
}

export const CategoriesView: React.FC = () => {
  const { familyId, refreshKey, triggerRefresh, showToast } = useApp();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<'expense' | 'income'>('expense');
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('#6366F1');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories?familyId=${familyId}&type=${typeFilter}`);
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, typeFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name,
          type: typeFilter,
          parent_id: parentId || undefined,
          color
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Category "${name}" created`);
      setModalOpen(false);
      setName('');
      setParentId('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to remove or disable category "${catName}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(json.message || 'Category deleted');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Financial Categories & Hierarchies
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Structure parent categories and subcategories with transaction safety safeguards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Expense / Income Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setTypeFilter('expense')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                typeFilter === 'expense'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Expense Categories
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                typeFilter === 'income'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Income Categories
            </button>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Category Hierarchical List */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs"
          >
            {/* Root Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {cat.name}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                  {cat.transaction_count || 0} transactions
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setParentId(cat.id);
                    setModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <Plus className="h-3 w-3" />
                  <span>Subcategory</span>
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1 text-slate-300 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Subcategories */}
            {cat.subcategories && cat.subcategories.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-4">
                {cat.subcategories.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{sub.name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(sub.id, sub.name)}
                      className="text-slate-300 hover:text-rose-500 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {parentId ? 'New Subcategory' : 'New Primary Category'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Groceries, Restaurants, Medical"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Color Palette</label>
                <div className="flex items-center gap-2">
                  {['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-xl transition-transform ${color === c ? 'scale-110 ring-2 ring-indigo-500' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
