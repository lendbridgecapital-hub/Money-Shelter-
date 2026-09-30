import crypto from 'crypto';
import { db } from '@/lib/db';
import type { OperationalRemark, PartnerNotification, RequiredDocumentItem, Role, ApplicationStatus } from '@/types/db';

// 1. Remarks
export function addOperationalRemark(data: {
  applicationId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  statusChangedTo?: ApplicationStatus | null;
  remark: string;
}): OperationalRemark {
  const id = `rem_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO operational_remarks (id, application_id, author_id, author_name, author_role, status_changed_to, remark, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.applicationId,
    data.authorId,
    data.authorName,
    data.authorRole,
    data.statusChangedTo || null,
    data.remark.trim(),
    now
  );

  return {
    id,
    applicationId: data.applicationId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    statusChangedTo: data.statusChangedTo || null,
    remark: data.remark.trim(),
    createdAt: now,
  };
}

export function listRemarksForApplication(applicationId: string): OperationalRemark[] {
  const rows = db
    .prepare('SELECT * FROM operational_remarks WHERE application_id = ? ORDER BY created_at DESC')
    .all(applicationId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id || r.applicationId),
    authorId: String(r.author_id || r.authorId),
    authorName: String(r.author_name || r.authorName || 'Operations'),
    authorRole: (r.author_role || r.authorRole) as Role,
    statusChangedTo: (r.status_changed_to || r.statusChangedTo) as ApplicationStatus | null,
    remark: String(r.remark || ''),
    createdAt: String(r.created_at || r.createdAt || ''),
  }));
}

// 2. Required Documents Requested by Operator
export function addRequiredDocuments(applicationId: string, docTitles: string[]): void {
  const now = new Date().toISOString();
  for (const title of docTitles) {
    if (!title.trim()) continue;
    const id = `req_${crypto.randomBytes(8).toString('hex')}`;
    db.prepare(
      `INSERT INTO required_documents (id, application_id, document_title, status, created_at)
       VALUES (?, ?, ?, 'PENDING', ?)`
    ).run(id, applicationId, title.trim(), now);
  }
}

export function listRequiredDocuments(applicationId: string): RequiredDocumentItem[] {
  const rows = db
    .prepare('SELECT * FROM required_documents WHERE application_id = ? ORDER BY created_at ASC')
    .all(applicationId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id || r.applicationId),
    documentTitle: String(r.document_title || r.documentTitle),
    status: (r.status as 'PENDING' | 'UPLOADED') || 'PENDING',
    uploadedFileUrl: r.uploaded_file_url || r.uploadedFileUrl ? String(r.uploaded_file_url || r.uploadedFileUrl) : undefined,
    uploadedAt: r.uploaded_at || r.uploadedAt ? String(r.uploaded_at || r.uploadedAt) : undefined,
    createdAt: String(r.created_at || r.createdAt || ''),
  }));
}

export function getRequiredDocumentById(id: string): RequiredDocumentItem | null {
  const r = db.prepare('SELECT * FROM required_documents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: String(r.id),
    applicationId: String(r.application_id || r.applicationId),
    documentTitle: String(r.document_title || r.documentTitle),
    status: (r.status as 'PENDING' | 'UPLOADED') || 'PENDING',
    uploadedFileUrl: r.uploaded_file_url || r.uploadedFileUrl ? String(r.uploaded_file_url || r.uploadedFileUrl) : undefined,
    uploadedAt: r.uploaded_at || r.uploadedAt ? String(r.uploaded_at || r.uploadedAt) : undefined,
    createdAt: String(r.created_at || r.createdAt || ''),
  };
}

export function markRequiredDocumentUploaded(id: string, fileUrl: string): void {
  const now = new Date().toISOString();
  db.prepare('UPDATE required_documents SET status = ?, uploaded_file_url = ?, uploaded_at = ? WHERE id = ?').run(
    'UPLOADED',
    fileUrl,
    now,
    id
  );
}

// 3. Notifications to RM and Channel Partner
export function createNotification(data: {
  tenantId?: string;
  recipientId: string;
  recipientRole: Role;
  applicationId: string;
  title: string;
  message: string;
}): PartnerNotification {
  const id = `notif_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';

  db.prepare(
    `INSERT INTO partner_notifications (id, tenant_id, recipient_id, recipient_role, application_id, title, message, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    tenantId,
    data.recipientId,
    data.recipientRole,
    data.applicationId,
    data.title,
    data.message,
    now
  );

  return {
    id,
    tenantId,
    recipientId: data.recipientId,
    recipientRole: data.recipientRole,
    applicationId: data.applicationId,
    title: data.title,
    message: data.message,
    read: false,
    createdAt: now,
  };
}

export function listNotificationsForUser(userId: string): PartnerNotification[] {
  const rows = db
    .prepare('SELECT * FROM partner_notifications WHERE recipient_id = ? ORDER BY created_at DESC')
    .all(userId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    tenantId: String(r.tenant_id || r.tenantId || 'default'),
    recipientId: String(r.recipient_id || r.recipientId),
    recipientRole: (r.recipient_role || r.recipientRole) as Role,
    applicationId: String(r.application_id || r.applicationId),
    title: String(r.title || ''),
    message: String(r.message || ''),
    read: Boolean(r.read === 1 || r.read === true),
    createdAt: String(r.created_at || r.createdAt || ''),
  }));
}
