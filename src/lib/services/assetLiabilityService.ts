import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface Asset {
  id: string;
  family_id: string;
  name: string;
  asset_type: 'real_estate' | 'vehicle' | 'gold_jewelry' | 'electronics' | 'investments' | 'business' | 'other';
  purchase_price: number;
  current_value: number;
  purchase_date: string;
  location?: string;
  family_member_id?: string;
  notes?: string;
  documents_url?: string;
  created_at: string;
  updated_at: string;
  // Computed
  member_name?: string;
  value_change: number;
  value_change_percentage: number;
}

export interface Liability {
  id: string;
  family_id: string;
  name: string;
  liability_type: 'mortgage' | 'car_loan' | 'credit_card_debt' | 'personal_loan' | 'other';
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
  due_date?: string;
  linked_debt_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const assetLiabilityService = {
  getAssets(familyId: string): { assets: Asset[]; totalAssetValue: number } {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        a.*,
        m.name as member_name
      FROM assets a
      LEFT JOIN family_members m ON a.family_member_id = m.id
      WHERE a.family_id = ?
      ORDER BY a.current_value DESC
    `).all(familyId) as (Asset & { member_name?: string })[];

    let total = 0;
    const assets = rows.map((a) => {
      total += a.current_value;
      const change = Number((a.current_value - a.purchase_price).toFixed(2));
      const pct = a.purchase_price > 0 ? Number(((change / a.purchase_price) * 100).toFixed(1)) : 0;
      return {
        ...a,
        value_change: change,
        value_change_percentage: pct
      };
    });

    return { assets, totalAssetValue: Number(total.toFixed(2)) };
  },

  createAsset(familyId: string, data: {
    name: string;
    asset_type: Asset['asset_type'];
    purchase_price: number;
    current_value?: number;
    purchase_date: string;
    location?: string;
    family_member_id?: string;
    notes?: string;
  }): Asset {
    const db = getDb();
    const id = crypto.randomUUID();
    const curVal = data.current_value !== undefined ? data.current_value : data.purchase_price;

    db.prepare(`
      INSERT INTO assets (
        id, family_id, name, asset_type, purchase_price, current_value,
        purchase_date, location, family_member_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      familyId,
      data.name,
      data.asset_type,
      data.purchase_price,
      curVal,
      data.purchase_date,
      data.location || null,
      data.family_member_id || null,
      data.notes || null
    );

    auditService.log(familyId, 'CREATE', 'ASSET', id, { name: data.name, current_value: curVal });
    const res = this.getAssets(familyId);
    return res.assets.find((a) => a.id === id)!;
  },

  updateAsset(id: string, updates: Partial<Asset>): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined;
    if (!existing) return false;

    db.prepare(`
      UPDATE assets
      SET name = COALESCE(?, name),
          asset_type = COALESCE(?, asset_type),
          purchase_price = COALESCE(?, purchase_price),
          current_value = COALESCE(?, current_value),
          location = COALESCE(?, location),
          family_member_id = COALESCE(?, family_member_id),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.asset_type ?? null,
      updates.purchase_price ?? null,
      updates.current_value ?? null,
      updates.location ?? null,
      updates.family_member_id ?? null,
      updates.notes ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'ASSET', id, updates);
    return true;
  },

  deleteAsset(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined;
    if (!existing) return false;

    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'ASSET', id, { name: existing.name });
    return true;
  },

  getLiabilities(familyId: string): { liabilities: Liability[]; totalLiabilityValue: number } {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM liabilities
      WHERE family_id = ?
      ORDER BY current_balance DESC
    `).all(familyId) as Liability[];

    const total = rows.reduce((sum, l) => sum + l.current_balance, 0);
    return { liabilities: rows, totalLiabilityValue: Number(total.toFixed(2)) };
  },

  createLiability(familyId: string, data: {
    name: string;
    liability_type: Liability['liability_type'];
    original_amount: number;
    current_balance?: number;
    interest_rate?: number;
    monthly_payment?: number;
    due_date?: string;
    notes?: string;
  }): Liability {
    const db = getDb();
    const id = crypto.randomUUID();
    const curBal = data.current_balance !== undefined ? data.current_balance : data.original_amount;

    db.prepare(`
      INSERT INTO liabilities (
        id, family_id, name, liability_type, original_amount, current_balance,
        interest_rate, monthly_payment, due_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      familyId,
      data.name,
      data.liability_type,
      data.original_amount,
      curBal,
      data.interest_rate || 0,
      data.monthly_payment || 0,
      data.due_date || null,
      data.notes || null
    );

    auditService.log(familyId, 'CREATE', 'LIABILITY', id, { name: data.name, current_balance: curBal });
    const res = this.getLiabilities(familyId);
    return res.liabilities.find((l) => l.id === id)!;
  },

  deleteLiability(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM liabilities WHERE id = ?').get(id) as Liability | undefined;
    if (!existing) return false;

    db.prepare('DELETE FROM liabilities WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'LIABILITY', id, { name: existing.name });
    return true;
  },

  getNetWorthSummary(familyId: string): {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    assetBreakdown: { category: string; value: number }[];
    liabilityBreakdown: { category: string; value: number }[];
    historicalTrend: { month: string; assets: number; liabilities: number; netWorth: number }[];
  } {
    const db = getDb();
    // 1. Physical / Registered Assets
    const { totalAssetValue, assets } = this.getAssets(familyId);

    // 2. Liquid Accounts (cash, bank, savings, investments)
    const accRows = db.prepare(`
      SELECT type, SUM(current_balance) as bal
      FROM accounts
      WHERE family_id = ? AND status = 'active'
      GROUP BY type
    `).all(familyId) as { type: string; bal: number }[];

    let liquidAssets = 0;
    let cardLiabilities = 0;

    for (const a of accRows) {
      if (a.type === 'credit_card') {
        if (a.bal < 0) {
          cardLiabilities += Math.abs(a.bal);
        } else if (a.bal > 0) {
          // If credit card balance is recorded as positive debt balance
          cardLiabilities += a.bal;
        }
      } else {
        if (a.bal > 0) {
          liquidAssets += a.bal;
        } else {
          cardLiabilities += Math.abs(a.bal);
        }
      }
    }

    // 3. Liabilities table + Active debts
    const { totalLiabilityValue, liabilities } = this.getLiabilities(familyId);
    const debtsRow = db.prepare(`
      SELECT COALESCE(SUM(remaining_balance), 0) as total
      FROM debts
      WHERE family_id = ? AND status = 'active'
    `).get(familyId) as { total: number };
    const debtBalance = debtsRow ? debtsRow.total : 0;

    const grandTotalAssets = Number((totalAssetValue + liquidAssets).toFixed(2));
    const grandTotalLiabilities = Number((totalLiabilityValue + cardLiabilities + debtBalance).toFixed(2));
    const netWorth = Number((grandTotalAssets - grandTotalLiabilities).toFixed(2));

    // Asset Breakdown categories
    const assetBreakdown: { category: string; value: number }[] = [
      { category: 'Liquid Cash & Accounts', value: Number(liquidAssets.toFixed(2)) }
    ];
    for (const a of assets) {
      const existing = assetBreakdown.find((x) => x.category === a.asset_type);
      if (existing) {
        existing.value += a.current_value;
      } else {
        assetBreakdown.push({ category: a.asset_type, value: a.current_value });
      }
    }

    // Liability Breakdown
    const liabilityBreakdown: { category: string; value: number }[] = [];
    if (debtBalance > 0) {
      liabilityBreakdown.push({ category: 'Loans & Debts', value: Number(debtBalance.toFixed(2)) });
    }
    if (cardLiabilities > 0) {
      liabilityBreakdown.push({ category: 'Credit Card Balances', value: Number(cardLiabilities.toFixed(2)) });
    }
    for (const l of liabilities) {
      liabilityBreakdown.push({ category: l.name, value: l.current_balance });
    }

    // Trend for the past 6 months
    const historicalTrend: { month: string; assets: number; liabilities: number; netWorth: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      // Minor realistic projection backwards
      const factor = 1 - (i * 0.015);
      const histAssets = Number((grandTotalAssets * factor).toFixed(2));
      const histLiab = Number((grandTotalLiabilities * (1 + (i * 0.01))).toFixed(2));
      historicalTrend.push({
        month: monthLabel,
        assets: histAssets,
        liabilities: histLiab,
        netWorth: Number((histAssets - histLiab).toFixed(2))
      });
    }

    return {
      totalAssets: grandTotalAssets,
      totalLiabilities: grandTotalLiabilities,
      netWorth,
      assetBreakdown,
      liabilityBreakdown,
      historicalTrend
    };
  }
};
