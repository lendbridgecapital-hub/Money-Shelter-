import crypto from 'crypto';
import { db } from '@/lib/db';
import type { EmailLog } from '@/types/db';

export function logEmail(data: {
  tenantId?: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  status: 'SENT' | 'FAILED' | 'SMTP_NOT_CONFIGURED';
  errorMessage?: string | null;
  messageId?: string | null;
}): EmailLog {
  const id = `eml_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';

  try {
    db.prepare(
      `INSERT INTO email_logs (id, tenant_id, to_email, subject, body_html, status, error_message, message_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      tenantId,
      data.toEmail.trim(),
      data.subject.trim(),
      data.bodyHtml,
      data.status,
      data.errorMessage || null,
      data.messageId || null,
      now
    );
  } catch (err) {
    console.warn('[emailRepo] Error logging email:', err);
  }

  return {
    id,
    tenantId,
    toEmail: data.toEmail,
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    status: data.status,
    errorMessage: data.errorMessage || null,
    messageId: data.messageId || null,
    createdAt: now,
  };
}

export function updateEmailLog(
  id: string,
  updates: {
    status: 'SENT' | 'FAILED' | 'SMTP_NOT_CONFIGURED';
    errorMessage?: string | null;
    messageId?: string | null;
  }
): void {
  try {
    db.prepare(
      `UPDATE email_logs
       SET status = ?, error_message = ?, message_id = ?
       WHERE id = ?`
    ).run(updates.status, updates.errorMessage || null, updates.messageId || null, id);
  } catch (err) {
    console.warn('[emailRepo] Error updating email log:', err);
  }
}

export function listEmailLogs(tenantId = 'default', limit = 50): EmailLog[] {
  try {
    const rows = db
      .prepare('SELECT * FROM email_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(tenantId, limit) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      tenantId: String(r.tenant_id || r.tenantId || 'default'),
      toEmail: String(r.to_email || r.toEmail || ''),
      subject: String(r.subject || ''),
      bodyHtml: String(r.body_html || r.bodyHtml || ''),
      status: (r.status as 'SENT' | 'FAILED' | 'SMTP_NOT_CONFIGURED') || 'SENT',
      errorMessage: r.error_message || r.errorMessage ? String(r.error_message || r.errorMessage) : null,
      messageId: r.message_id || r.messageId ? String(r.message_id || r.messageId) : null,
      createdAt: String(r.created_at || r.createdAt || ''),
    }));
  } catch {
    return [];
  }
}
