import { getDb } from '@/lib/db';
import crypto from 'crypto';

export interface AuditLogItem {
  id: string;
  family_id: string;
  user_id?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'PAYMENT' | 'SEED';
  entity: 'TRANSACTION' | 'ACCOUNT' | 'BUDGET' | 'SAVINGS_GOAL' | 'DEBT' | 'SUBSCRIPTION' | 'ASSET' | 'LIABILITY' | 'CATEGORY' | 'FAMILY_MEMBER';
  entity_id: string;
  details?: string;
  created_at: string;
}

export const auditService = {
  log(familyId: string, action: AuditLogItem['action'], entity: AuditLogItem['entity'], entityId: string, details?: Record<string, unknown>, userId?: string) {
    try {
      const db = getDb();
      const id = crypto.randomUUID();
      const detailsStr = details ? JSON.stringify(details) : null;
      db.prepare(`
        INSERT INTO audit_logs (id, family_id, user_id, action, entity, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, familyId, userId || null, action, entity, entityId, detailsStr);
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  },

  getRecentLogs(familyId: string, limit: number = 50): AuditLogItem[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM audit_logs
      WHERE family_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(familyId, limit);
    return rows as unknown as AuditLogItem[];
  }
};
