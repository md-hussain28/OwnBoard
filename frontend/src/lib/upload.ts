// Upload limits + client-side pre-flight validation, shared by every upload surface (doc-pack
// tracks and project knowledge-base docs). Mirrors the backend limits
// (backend/onboard/config/constants.py) so a bad batch fails instantly in the browser instead of
// tying up the 512MB API instance — and so the max-size number we show in the UI is the same
// number the backend enforces.
//
// Files are uploaded straight to Supabase Storage via a signed URL (see lib/api/signed-upload.ts),
// NOT proxied through the Next.js route handler — otherwise Vercel's ~4.5MB serverless request-body
// cap would 413 uploads near the limit.

export const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_MB = MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024);
export const MAX_UPLOAD_FILES_PER_BATCH = 10;

const ALLOWED_EXTENSIONS = new Set(["pdf"]);

/** First problem with a single file (type, emptiness, size), or null when it is acceptable. */
export function fileError(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return `${file.name} is not supported — only PDF files up to ${MAX_UPLOAD_FILE_SIZE_MB} MB.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return `${file.name} is larger than ${MAX_UPLOAD_FILE_SIZE_MB} MB.`;
  }
  return null;
}

/** Pre-flight check for a whole batch; returns an error message or null when acceptable. */
export function validateFiles(files: File[]): string | null {
  if (files.length === 0) return "Choose at least one file.";
  if (files.length > MAX_UPLOAD_FILES_PER_BATCH) {
    return `Upload at most ${MAX_UPLOAD_FILES_PER_BATCH} files at a time.`;
  }
  for (const file of files) {
    const error = fileError(file);
    if (error) return error;
  }
  return null;
}
