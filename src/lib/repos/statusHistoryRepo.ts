import crypto from 'crypto';
import { db } from '@/lib/db';
import type { StatusHistoryItem, ApplicationStatus } from '@/types/db';

export function addStatusHistory(data: {
  applicationId: string;
  status: ApplicationStatus;
  note?: string | null;
  changedById?: string | null;
}): void {
  const id = `sh_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO status_history (id, application_id, status, note, changed_by_id, changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.applicationId, data.status, data.note || null, data.changedById || null, now);
}

export function listStatusHistory(applicationId: string): StatusHistoryItem[] {
  const rows = db
    .prepare(
      `SELECT sh.*, u.name as changed_by_name
       FROM status_history sh
       LEFT JOIN users u ON sh.changed_by_id = u.id
       WHERE sh.application_id = ?
       ORDER BY sh.changed_at DESC`
    )
    .all(applicationId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id || r.applicationId),
    status: (r.status as ApplicationStatus) || 'LINK_SHARED',
    note: r.note ? String(r.note) : null,
    changedById: r.changed_by_id || r.changedById ? String(r.changed_by_id || r.changedById) : null,
    changedByName: r.changed_by_name || r.changedByName ? String(r.changed_by_name || r.changedByName) : null,
    changedAt: String(r.changed_at || r.changedAt || ''),
  }));
}
