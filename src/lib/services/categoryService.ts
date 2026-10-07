import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { auditService } from './auditService';

export interface Category {
  id: string;
  family_id: string;
  name: string;
  type: 'expense' | 'income';
  parent_id?: string;
  icon: string;
  color: string;
  is_system: number;
  is_active: number;
  created_at: string;
  // Computed
  subcategories?: Category[];
  transaction_count?: number;
}

export const categoryService = {
  getCategories(familyId: string, type?: 'expense' | 'income'): Category[] {
    const db = getDb();
    let query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM transactions WHERE category_id = c.id) as transaction_count
      FROM categories c
      WHERE c.family_id = ? AND c.is_active = 1
    `;
    const params: unknown[] = [familyId];

    if (type) {
      query += ' AND c.type = ?';
      params.push(type);
    }

    query += ' ORDER BY c.name ASC';

    const all = db.prepare(query).all(...params) as (Category & { transaction_count: number })[];

    // Build hierarchy (root categories have parent_id = null)
    const roots = all.filter((c) => !c.parent_id);
    return roots.map((root) => ({
      ...root,
      subcategories: all.filter((child) => child.parent_id === root.id)
    }));
  },

  getAllFlat(familyId: string): Category[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM transactions WHERE category_id = c.id) as transaction_count
      FROM categories c
      WHERE c.family_id = ? AND c.is_active = 1
      ORDER BY c.name ASC
    `).all(familyId) as Category[];
    return rows;
  },

  createCategory(familyId: string, data: {
    name: string;
    type: 'expense' | 'income';
    parent_id?: string;
    icon?: string;
    color?: string;
  }): Category {
    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO categories (
        id, family_id, name, type, parent_id, icon, color, is_system, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
    `).run(
      id,
      familyId,
      data.name,
      data.type,
      data.parent_id || null,
      data.icon || 'tag',
      data.color || '#6B7280'
    );

    auditService.log(familyId, 'CREATE', 'CATEGORY', id, { name: data.name, type: data.type });
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
    return row;
  },

  updateCategory(id: string, updates: Partial<Category>): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
    if (!existing) return false;

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.icon ?? null,
      updates.color ?? null,
      updates.is_active ?? null,
      id
    );

    auditService.log(existing.family_id, 'UPDATE', 'CATEGORY', id, updates);
    return true;
  },

  deleteCategory(id: string): { success: boolean; message?: string } {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
    if (!existing) return { success: false, message: 'Category not found' };

    // Check if transactions exist
    const txRow = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE category_id = ?').get(id) as { cnt: number };
    if (txRow && txRow.cnt > 0) {
      // Safely disable rather than cascade delete transactions
      db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(id);
      auditService.log(existing.family_id, 'UPDATE', 'CATEGORY', id, { is_active: 0, reason: 'disabled_due_to_existing_transactions' });
      return { success: true, message: `Category disabled because ${txRow.cnt} existing transactions depend on it.` };
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    auditService.log(existing.family_id, 'DELETE', 'CATEGORY', id, { name: existing.name });
    return { success: true };
  }
};
