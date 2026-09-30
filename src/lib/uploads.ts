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
