'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  Scale,
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  Sparkles,
  Edit,
  Car,
  Home,
  Coins,
  Laptop,
  Briefcase,
  X
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  purchase_price: number;
  current_value: number;
  purchase_date: string;
  location?: string;
  member_name?: string;
  value_change: number;
  value_change_percentage: number;
}

interface Liability {
  id: string;
  name: string;
  liability_type: string;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
}

export const AssetsLiabilitiesView: React.FC = () => {
  const { familyId, formatCurrency, refreshKey, triggerRefresh, showToast } = useApp();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [netWorthData, setNetWorthData] = useState<{
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    historicalTrend: { month: string; assets: number; liabilities: number; netWorth: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // New Asset Modal
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('real_estate');
  const [buyPrice, setBuyPrice] = useState('');
  const [curVal, setCurVal] = useState('');
  const [buyDate, setBuyDate] = useState('2026-10-01');
  const [location, setLocation] = useState('');

  useEffect(() => {
    setBuyDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Update Valuation Modal
  const [valAsset, setValAsset] = useState<Asset | null>(null);
  const [newValuation, setNewValuation] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, lRes, rRes] = await Promise.all([
        fetch(`/api/assets?familyId=${familyId}`),
        fetch(`/api/liabilities?familyId=${familyId}`),
        fetch(`/api/reports?familyId=${familyId}&type=net-worth`)
      ]);
      const aJson = await aRes.json();
      const lJson = await lRes.json();
      const rJson = await rRes.json();

      if (aJson.success) setAssets(aJson.data.assets);
      if (lJson.success) setLiabilities(lJson.data.liabilities);
      if (rJson.success && rJson.data.netWorth) setNetWorthData(rJson.data.netWorth);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          name: assetName,
          asset_type: assetType,
          purchase_price: parseFloat(buyPrice),
          current_value: curVal ? parseFloat(curVal) : parseFloat(buyPrice),
          purchase_date: buyDate,
          location: location || undefined
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Asset "${assetName}" registered!`);
      setAssetModalOpen(false);
      setAssetName('');
      setBuyPrice('');
      setCurVal('');
      setLocation('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    }
  };

  const handleUpdateValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valAsset) return;

    try {
      const res = await fetch(`/api/assets/${valAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_value: parseFloat(newValuation)
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`Valuation updated to ${formatCurrency(parseFloat(newValuation))}`);
      setValAsset(null);
      setNewValuation('');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      showToast(msg, 'error');
    }
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!confirm(`Delete asset "${name}"?`)) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast('Asset record removed');
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'real_estate': return Home;
      case 'vehicle': return Car;
      case 'gold_jewelry': return Coins;
      case 'electronics': return Laptop;
      case 'investments': return TrendingUp;
      default: return Briefcase;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Assets, Liabilities & Net Worth
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Formula: Net Worth = Total Assets (Physical + Liquid) − Total Liabilities (Debts + Revolving)
          </p>
        </div>

        <button
          onClick={() => setAssetModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Asset</span>
        </button>
      </div>

      {/* Net Worth Formula Hero Card */}
      {netWorthData && (
        <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-6 dark:border-indigo-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Audited Valuation
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Household Net Worth</span>
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                {formatCurrency(netWorthData.netWorth)}
              </div>
              <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                Household balance sheet is solvent and expanding.
              </p>
            </div>

            {/* Formula Equation Pill */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-800/80 backdrop-blur-xs">
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Assets</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(netWorthData.totalAssets)}
                </div>
              </div>
              <span className="text-xl font-bold text-slate-300">−</span>
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Liabilities</div>
                <div className="text-base font-bold text-rose-500">
                  {formatCurrency(netWorthData.totalLiabilities)}
                </div>
              </div>
              <span className="text-xl font-bold text-slate-300">=</span>
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Net Worth</div>
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(netWorthData.netWorth)}
                </div>
              </div>
            </div>
          </div>

          {/* Historical Trend Bar */}
          {netWorthData.historicalTrend.length > 0 && (
            <div className="mt-6 pt-6 border-t border-indigo-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                6-Month Net Worth Trajectory
              </div>
              <div className="grid grid-cols-6 gap-2">
                {netWorthData.historicalTrend.map((t, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-white/60 p-2.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{t.month}</div>
                    <div className="mt-1 text-xs font-black text-slate-900 dark:text-white truncate">
                      {formatCurrency(t.netWorth)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Household Assets Portfolio ({assets.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((ast) => {
            const Icon = getAssetIcon(ast.asset_type);
            const isGain = ast.value_change >= 0;

            return (
              <div
                key={ast.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ast.name}</h3>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {ast.asset_type.replace('_', ' ')} {ast.location ? `• ${ast.location}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAsset(ast.id, ast.name)}
                      className="p-1 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Current Valuation</span>
                    <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(ast.current_value)}
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
                      {isGain ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="mr-0.5 h-3.5 w-3.5" />+{formatCurrency(ast.value_change)} (+{ast.value_change_percentage}%)
                        </span>
                      ) : (
                        <span className="flex items-center text-rose-500">
                          <TrendingDown className="mr-0.5 h-3.5 w-3.5" />{formatCurrency(ast.value_change)} ({ast.value_change_percentage}%)
                        </span>
                      )}
                      <span className="text-slate-400 font-normal">since acquired</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">Acquired Price:</span>
                    <span className="font-semibold">{formatCurrency(ast.purchase_price)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Date: {ast.purchase_date}</span>
                  <button
                    onClick={() => {
                      setValAsset(ast);
                      setNewValuation(ast.current_value.toString());
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Update Value</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liabilities Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Household Liabilities & Obligations ({liabilities.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liabilities.map((l) => (
            <div
              key={l.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{l.name}</h3>
                    <p className="text-[11px] text-slate-400 capitalize">{l.liability_type.replace('_', ' ')}</p>
                  </div>
                  <span className="rounded-lg bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500 uppercase">
                    Liability
                  </span>
                </div>

                <div className="mt-5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Current Outstanding Balance</span>
                  <div className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(l.current_balance)}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Interest Rate:</span>
                    <span className="font-bold">{l.interest_rate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Monthly Payment:</span>
                    <span className="font-bold">{formatCurrency(l.monthly_payment)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Update Valuation Modal */}
      {valAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setValAsset(null)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Update Value: {valAsset.name}
              </h3>
              <button onClick={() => setValAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateValuation} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Estimated Valuation ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newValuation}
                  onChange={(e) => setNewValuation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setValAsset(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Save Valuation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Asset Modal */}
      {assetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setAssetModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Household Asset</h3>
              <button onClick={() => setAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Austin Primary Home, Tesla Model Y"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Type *</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="real_estate">Real Estate & Property</option>
                    <option value="vehicle">Automobile / Vehicle</option>
                    <option value="gold_jewelry">Precious Metals & Gold</option>
                    <option value="electronics">Tech Gear & Electronics</option>
                    <option value="investments">Equity & Startup Stock</option>
                    <option value="other">Other Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location / Safe</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Austin, TX, Home Vault"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Valuation ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={curVal}
                    onChange={(e) => setCurVal(e.target.value)}
                    placeholder="Defaults to purchase price"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Acquisition Date</label>
                <input
                  type="date"
                  value={buyDate}
                  onChange={(e) => setBuyDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssetModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
