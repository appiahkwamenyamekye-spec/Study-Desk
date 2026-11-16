import type { Timestamp } from 'firebase/firestore';
import { VALIDATION_LIMITS } from '../types/assignment';

/**
 * Formats a byte count into a human-readable size string (e.g., "1.4 MB").
 *
 * @param bytes - File size in bytes.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Formats a Firestore Timestamp into a concise, readable date string.
 *
 * @param timestamp - Firestore Timestamp or null while server timestamp resolves.
 */
export function formatTimestamp(timestamp: Timestamp | null | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return 'Just now';
  }

  const date = timestamp.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Derives a concise file format label from a MIME type and filename.
 *
 * @param fileType - MIME type string.
 * @param fileName - Original filename including extension.
 */
export function getFileKindLabel(fileType: string, fileName: string): string {
  const lowerType = fileType.toLowerCase();
  const ext = fileName.split('.').pop()?.toUpperCase() || '';

  if (lowerType === 'application/pdf' || ext === 'PDF') return 'PDF';
  if (lowerType.startsWith('image/')) return ext || 'Image';
  if (lowerType.includes('wordprocessingml') || ext === 'DOCX' || ext === 'DOC') return 'Document';
  if (lowerType.includes('presentationml') || ext === 'PPTX' || ext === 'PPT') return 'Slides';
  if (lowerType.includes('spreadsheetml') || ext === 'XLSX' || ext === 'CSV') return ext === 'CSV' ? 'CSV' : 'Spreadsheet';
  if (lowerType.includes('zip') || ext === 'ZIP') return 'ZIP Archive';
  if (lowerType.startsWith('text/')) return ext || 'Text';
  return ext && ext.length <= 6 ? ext : 'File';
}

/**
 * Checks whether a file MIME type can be previewed directly inside the browser.
 *
 * @param fileType - MIME type string.
 */
export function isPreviewableFileType(fileType: string): 'image' | 'pdf' | 'text' | null {
  const lower = fileType.toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower === 'application/pdf') return 'pdf';
  if (
    lower.startsWith('text/') ||
    lower === 'application/json' ||
    lower === 'application/javascript'
  ) {
    return 'text';
  }
  return null;
}

/**
 * Converts a browser File into an array of Base64 string slices bounded
 * safely below Firestore's 1 MB document limit.
 *
 * @param file - The File selected by the user.
 * @throws Error if the file is empty or exceeds the maximum allowed size.
 */
export async function fileToBase64Chunks(file: File): Promise<string[]> {
  if (file.size <= 0) {
    throw new Error('The selected file is empty.');
  }
  if (file.size > VALIDATION_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${formatFileSize(VALIDATION_LIMITS.MAX_FILE_SIZE_BYTES)}.`,
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const blockSize = 0x8000;

  for (let i = 0; i < bytes.length; i += blockSize) {
    const slice = bytes.subarray(i, i + blockSize);
    binary += String.fromCharCode(...slice);
  }

  const base64 = btoa(binary);
  const chunks: string[] = [];

  for (let offset = 0; offset < base64.length; offset += VALIDATION_LIMITS.CHUNK_CHAR_SIZE) {
    chunks.push(base64.slice(offset, offset + VALIDATION_LIMITS.CHUNK_CHAR_SIZE));
  }

  if (chunks.length > VALIDATION_LIMITS.MAX_CHUNKS) {
    throw new Error('File exceeds the maximum chunk count.');
  }

  return chunks;
}

/**
 * Reconstructs a downloadable Blob from ordered Base64 chunks.
 *
 * @param chunks - Ordered Base64 string chunks.
 * @param mimeType - Original MIME type of the file.
 */
export function base64ChunksToBlob(chunks: string[], mimeType: string): Blob {
  const fullBase64 = chunks.join('');
  const binary = atob(fullBase64);
  const byteArray = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    byteArray[i] = binary.charCodeAt(i);
  }

  return new Blob([byteArray], { type: mimeType || 'application/octet-stream' });
}
