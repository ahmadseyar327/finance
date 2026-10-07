import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id?: string;
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
  role: string;
  avatar_color: string;
  monthly_budget_cap: number;
  status: 'active' | 'archived';
  created_at: string;
  // Computed
  total_income: number;
  total_expenses: number;
  net_contribution: number;
  transaction_count: number;
}

export const familyService = {
  getMembers(familyId: string): FamilyMember[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM family_members
      WHERE family_id = ? AND status = 'active'
      ORDER BY 
        CASE relationship 
          WHEN 'Father' THEN 1 
          WHEN 'Mother' THEN 2 
          WHEN 'Son' THEN 3 
          WHEN 'Daughter' THEN 4 
          ELSE 5 
        END, name ASC
    `).all(familyId) as FamilyMember[];

    return rows.map((m) => {
      // Income
      const inc = db.prepare(`
        SELECT COALESCE(SUM(converted_amount), 0) as total
        FROM transactions
        WHERE family_member_id = ? AND type = 'income'
      `).get(m.id) as { total: number };

      // Expenses
      const exp = db.prepare(`
        SELECT COALESCE(SUM(converted_amount), 0) as total, COUNT(*) as cnt
        FROM transactions
        WHERE family_member_id = ? AND type = 'expense'
      `).get(m.id) as { total: number; cnt: number };

      const totalIncome = inc ? Number(inc.total.toFixed(2)) : 0;
      const totalExpenses = exp ? Number(exp.total.toFixed(2)) : 0;
      const count = exp ? exp.cnt : 0;

      return {
        ...m,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_contribution: Number((totalIncome - totalExpenses).toFixed(2)),
        transaction_count: count
      };
    });
  },

  getMemberById(id: string): FamilyMember | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM family_members WHERE id = ?').get(id) as FamilyMember | undefined;
    if (!row) return null;
    const list = this.getMembers(row.family_id);
    return list.find((m) => m.id === id) || null;
  },

  createMember(familyId: string, data: {
    name: string;
    relationship: string;
    email?: string;
    phone?: string;
    role?: string;
    avatar_color?: string;
    monthly_budget_cap?: number;
  }): FamilyMember {
    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO family_members (
        id, family_id, name, relationship, email, phone, role,
        avatar_color, monthly_budget_cap, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      familyId,
      data.name,
      data.relationship,
      data.email || null,
      data.phone || null,
      data.role || 'Adult Member',
      data.avatar_color || '#6366F1',
      data.monthly_budget_cap || 0
    );

    auditService.log(familyId, 'CREATE', 'FAMILY_MEMBER', id, { name: data.name, relationship: data.relationship });
    return this.getMemberById(id)!;
  },

  updateMember(id: string, updates: Partial<FamilyMember>): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM family_members WHERE id = ?').get(id) as FamilyMember | undefined;
    if (!existing) return false;

    db.prepare(`
      UPDATE family_members
      SET name = COALESCE(?, name),
          relationship = COALESCE(?, relationship),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          role = COALESCE(?, role),
          avatar_color = COALESCE(?, avatar_color),
          monthly_budget_cap = COALESCE(?, monthly_budget_cap),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.relationship ?? null,
      updates.email ?? null,
      updates.phone ?? null,
      updates.role ?? null,
      updates.avatar_color ?? null,
      updates.monthly_budget_cap ?? null,
      updates.status ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'FAMILY_MEMBER', id, updates);
    return true;
  },

  archiveMember(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM family_members WHERE id = ?').get(id) as FamilyMember | undefined;
    if (!existing) return false;

    db.prepare("UPDATE family_members SET status = 'archived' WHERE id = ?").run(id);
    auditService.log(existing.family_id, 'UPDATE', 'FAMILY_MEMBER', id, { status: 'archived' });
    return true;
  }
};
