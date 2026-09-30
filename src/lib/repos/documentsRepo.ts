import crypto from 'crypto';
import { db } from '@/lib/db';
import type { ApplicationDocument, DocumentCategory } from '@/types/db';

export function addDocument(data: {
  applicationId: string;
  category: DocumentCategory;
  label: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}): ApplicationDocument {
  const id = `doc_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO application_documents (id, application_id, category, label, file_name, file_url, file_size, mime_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.applicationId, data.category, data.label, data.fileName, data.fileUrl, data.fileSize, data.mimeType, now);

  return {
    id,
    applicationId: data.applicationId,
    category: data.category,
    label: data.label,
    fileName: data.fileName,
    fileUrl: data.fileUrl,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    createdAt: now,
  };
}

export function listDocumentsForApplication(applicationId: string): ApplicationDocument[] {
  const rows = db
    .prepare('SELECT * FROM application_documents WHERE application_id = ? ORDER BY created_at ASC')
    .all(applicationId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id || r.applicationId),
    category: (r.category as DocumentCategory) || 'OTHER',
    label: String(r.label),
    fileName: String(r.file_name || r.fileName),
    fileUrl: String(r.file_url || r.fileUrl),
    fileSize: Number(r.file_size || r.fileSize || 0),
    mimeType: String(r.mime_type || r.mimeType || 'application/octet-stream'),
    createdAt: String(r.created_at || r.createdAt || ''),
  }));
}
