import { z } from "zod";

export const docPackDocumentSchema = z
  .object({
    id: z.string(),
    doc_pack_id: z.string(),
    title: z.string(),
    file_type: z.string(),
    file_size_bytes: z.number(),
    status: z.enum(["uploaded", "processing", "processed", "failed"]),
    page_count: z.number().nullable(),
    error_message: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((d) => ({
    id: d.id,
    docPackId: d.doc_pack_id,
    title: d.title,
    fileType: d.file_type,
    fileSizeBytes: d.file_size_bytes,
    status: d.status,
    pageCount: d.page_count,
    errorMessage: d.error_message,
    createdAt: d.created_at,
  }));

const docPackBase = {
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "archived", "needs_review"]),
  created_by: z.string().nullable(),
  created_at: z.string(),
};

export const docPackListItemSchema = z.object(docPackBase).transform((p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  status: p.status,
  createdBy: p.created_by,
  createdAt: p.created_at,
}));

export const docPackSchema = z
  .object({ ...docPackBase, documents: z.array(docPackDocumentSchema).default([]) })
  .transform((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    createdBy: p.created_by,
    createdAt: p.created_at,
    documents: p.documents,
  }));

export const docPackListSchema = z.array(docPackListItemSchema);
export const docPackDocumentListSchema = z.array(docPackDocumentSchema);

export type DocPackDocument = z.infer<typeof docPackDocumentSchema>;
export type DocPackListItem = z.infer<typeof docPackListItemSchema>;
export type DocPack = z.infer<typeof docPackSchema>;
