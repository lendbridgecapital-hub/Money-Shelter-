import fs from 'fs';
import path from 'path';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface SavedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Saves a File object to the local disk in public/uploads/<subfolder>/
 * In cloud deployments, this can be swapped with AWS S3, Cloudflare R2, or Google Cloud Storage.
 */
export async function saveUploadedFile(file: File, subfolder = 'general'): Promise<SavedFile> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const cleanSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', cleanSubfolder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate safe unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(file.name) || '.bin';
  const rawBaseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = `${timestamp}_${randomStr}_${rawBaseName}${ext}`;

  const filePath = path.join(uploadDir, safeFileName);
  fs.writeFileSync(filePath, buffer);

  const fileUrl = `/uploads/${cleanSubfolder}/${safeFileName}`;

  return {
    fileName: file.name,
    fileUrl,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
}

/**
 * Saves a base64 Data URL (e.g. data:image/jpeg;base64,...) to disk
 * in public/uploads/<subfolder>/ and returns the relative URL (/uploads/...).
 * If input is already a URL or empty, returns it as is.
 */
export function saveBase64Document(dataUrl?: string | null, subfolder = 'partners', prefix = 'doc'): string | null {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith('data:')) return dataUrl;

  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = '.png';
    if (mimeType.includes('pdf')) ext = '.pdf';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';

    const cleanSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', cleanSubfolder);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const safeFileName = `${timestamp}_${randomStr}_${prefix}${ext}`;
    const filePath = path.join(uploadDir, safeFileName);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${cleanSubfolder}/${safeFileName}`;
  } catch (err) {
    console.error('[uploads] Error saving base64 document:', err);
    return dataUrl;
  }
}

