import axios from "axios";
import { signedUploadUrlsSchema } from "@/schemas";
import { getApiClient } from "./api-client";

/**
 * Direct-to-storage upload in three steps, shared by every file-upload surface:
 *
 *   1. POST `urlsEndpoint` — backend validates the batch (PDF-only, ≤20MB) and returns a short-lived
 *      Supabase signed upload URL per file.
 *   2. PUT each file straight to Supabase Storage. These bytes never transit the Next.js/Vercel proxy,
 *      so they dodge Vercel's ~4.5MB serverless request-body cap — the 20MB limit is genuinely usable.
 *   3. POST `registerEndpoint` — backend records the uploaded objects and kicks off background ingest.
 *
 * Returns the raw `register` response body; the caller parses it with its own zod schema (doc-packs
 * get a document list, projects get the refreshed docs surface). `onProgress` reports 0–100 across
 * the whole batch during step 2.
 */
export async function performSignedUpload(opts: {
  urlsEndpoint: string;
  registerEndpoint: string;
  files: File[];
  onProgress?: (percent: number) => void;
}): Promise<unknown> {
  const { urlsEndpoint, registerEndpoint, files, onProgress } = opts;
  const client = getApiClient();

  // 1) Validate + mint signed URLs. Backend preserves request order, so targets[i] ↔ files[i].
  const { data: urlsData } = await client.post(urlsEndpoint, {
    files: files.map((f) => ({
      filename: f.name,
      content_type: f.type || "application/octet-stream",
      size: f.size,
    })),
  });
  const targets = signedUploadUrlsSchema.parse(urlsData);

  // 2) Upload the bytes directly to Supabase (bypassing the Vercel body cap).
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
  const loaded = new Array<number>(files.length).fill(0);
  const emitProgress = () => {
    if (!onProgress) return;
    const done = loaded.reduce((a, b) => a + b, 0);
    onProgress(Math.min(100, Math.round((done / totalBytes) * 100)));
  };

  await Promise.all(
    targets.map((target, i) =>
      // Bare axios (not the `/api` client): the file goes to Supabase, not our backend.
      axios
        .put(target.uploadUrl, files[i], {
          headers: { "Content-Type": target.contentType, "x-upsert": "true" },
          timeout: 300_000,
          onUploadProgress: (event) => {
            loaded[i] = event.loaded ?? 0;
            emitProgress();
          },
        })
        .catch((err) => {
          // Turn a raw storage error into something user-facing (getApiErrorMessage reads Error.message).
          // The batch is already size-validated client- and server-side before we get here, so a 413
          // from storage means the file exceeded the bucket's own cap.
          const status = axios.isAxiosError(err) ? err.response?.status : undefined;
          throw new Error(
            status === 413
              ? `${files[i].name} is too large to upload.`
              : `Couldn't upload ${files[i].name}. Please try again.`,
          );
        }),
    ),
  );
  onProgress?.(100);

  // 3) Register the uploaded objects so the backend creates rows + starts ingest.
  const { data: registerData } = await client.post(registerEndpoint, {
    files: targets.map((t, i) => ({
      document_id: t.documentId,
      filename: t.filename,
      storage_path: t.storagePath,
      content_type: t.contentType,
      size: files[i].size,
    })),
  });
  return registerData;
}
