'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Trash2,
  X,
  CreditCard
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
  role: string;
  avatar_color: string;
  monthly_budget_cap: number;
  total_income: number;
  total_expenses: number;
  net_contribution: number;
  transaction_count: number;
}

export const FamilyMembersView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [rel, setRel] = useState('Father');
  const [role, setRole] = useState('Adult Member');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cap, setCap] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/family-members?familyId=${familyId}`);
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/family-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name,
          relationship: rel,
          role,
          email: email || undefined,
          phone: phone || undefined,
          monthly_budget_cap: cap ? parseFloat(cap) : 0,
          avatar_color: color
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Family member "${name}" added!`);
      setModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setCap('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleArchive = async (id: string, memberName: string) => {
    if (!confirm(`Archive family member profile "${memberName}"? Historical transactions will remain preserved.`)) return;
    try {
      const res = await fetch(`/api/family-members/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Member profile archived');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Archive failed';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Family Members & Spending Caps
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assign transactions to household members and manage individual spending responsibility
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Add Family Member</span>
        </button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((m) => {
          const capPct = m.monthly_budget_cap > 0 ? Math.min(100, Math.round((m.total_expenses / m.monthly_budget_cap) * 100)) : 0;
          const isOverCap = m.monthly_budget_cap > 0 && m.total_expenses > m.monthly_budget_cap;

          return (
            <div
              key={m.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-black text-lg shadow-sm"
                      style={{ backgroundColor: m.avatar_color }}
                    >
                      {m.name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</h3>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {m.relationship}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleArchive(m.id, m.name)}
                    className="p-1 text-slate-300 hover:text-rose-500"
                    title="Archive member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-indigo-500" />
                  <span>{m.role}</span>
                </div>

                {/* Financial stats */}
                <div className="mt-5 space-y-2 rounded-2xl bg-slate-50/60 p-3 text-[11px] dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Income:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(m.total_income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Expenses:</span>
                    <span className="font-bold text-rose-500">
                      -{formatCurrency(m.total_expenses)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-semibold">
                    <span className="text-slate-500">Net Contribution:</span>
                    <span className={m.net_contribution >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}>
                      {formatCurrency(m.net_contribution)}
                    </span>
                  </div>
                </div>

                {/* Monthly budget cap */}
                {m.monthly_budget_cap > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Monthly Spending Cap:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(m.total_expenses)} / {formatCurrency(m.monthly_budget_cap)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOverCap ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        style={{ width: `${capPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>{m.transaction_count} transactions logged</span>
                {m.email && <span className="truncate max-w-[120px]">{m.email}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Family Member</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Henderson"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                  <select
                    value={rel}
                    onChange={(e) => setRel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Family Admin">Family Admin</option>
                    <option value="Adult Member">Adult Member</option>
                    <option value="Limited Member">Limited Member</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Spending Cap ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    placeholder="e.g. 1500.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@henderson.family"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Avatar Color</label>
                <div className="flex items-center gap-2">
                  {['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9', '#EF4444'].map((c) => (
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
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
