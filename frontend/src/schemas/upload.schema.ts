import { z } from "zod";

/** One signed upload target returned by `POST .../upload-urls` — the browser PUTs a single file to
 * `uploadUrl` (a short-lived Supabase Storage URL), then echoes `documentId`/`filename`/`storagePath`
 * back to `.../register`. snake_case on the wire → camelCase here. */
export const signedUploadTargetSchema = z
  .object({
    document_id: z.string(),
    filename: z.string(),
    storage_path: z.string(),
    upload_url: z.string(),
    token: z.string(),
    content_type: z.string(),
  })
  .transform((t) => ({
    documentId: t.document_id,
    filename: t.filename,
    storagePath: t.storage_path,
    uploadUrl: t.upload_url,
    token: t.token,
    contentType: t.content_type,
  }));

export type SignedUploadTarget = z.infer<typeof signedUploadTargetSchema>;

export const signedUploadUrlsSchema = z
  .object({ uploads: z.array(signedUploadTargetSchema).default([]) })
  .transform((d) => d.uploads);
