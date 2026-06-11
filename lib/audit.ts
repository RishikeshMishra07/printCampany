import { query } from '@/lib/db';

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  changedBy: string,
  details: any
) {
  try {
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, changed_by, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [action, entityType, entityId, changedBy, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
