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
  domain_id: z.string().nullable().optional(),
  domain_name: z.string().nullable().optional(),
  assign_to_all: z.boolean().optional().default(false),
  audience_domain_ids: z.array(z.string()).optional().default([]),
  audience_domain_names: z.array(z.string()).optional().default([]),
  sequence_order: z.number().optional().default(0),
  estimated_minutes: z.number().nullable().optional().default(null),
  due_offset_days: z.number().nullable().optional().default(null),
  pass_pct: z.number().optional().default(100),
};

export const docPackListItemSchema = z.object(docPackBase).transform((p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  status: p.status,
  createdBy: p.created_by,
  createdAt: p.created_at,
  domainId: p.domain_id ?? null,
  domainName: p.domain_name ?? null,
  assignToAll: p.assign_to_all,
  audienceDomainIds: p.audience_domain_ids,
  audienceDomainNames: p.audience_domain_names,
  sequenceOrder: p.sequence_order,
  estimatedMinutes: p.estimated_minutes,
  dueOffsetDays: p.due_offset_days,
  passPct: p.pass_pct,
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
    domainId: p.domain_id ?? null,
    domainName: p.domain_name ?? null,
    assignToAll: p.assign_to_all,
    audienceDomainIds: p.audience_domain_ids,
    audienceDomainNames: p.audience_domain_names,
    sequenceOrder: p.sequence_order,
    estimatedMinutes: p.estimated_minutes,
    dueOffsetDays: p.due_offset_days,
    passPct: p.pass_pct,
    documents: p.documents,
  }));

export const docPackListSchema = z.array(docPackListItemSchema);
export const docPackDocumentListSchema = z.array(docPackDocumentSchema);

const documentIngestStatusItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: z.enum(["uploaded", "processing", "processed", "failed"]),
    page_count: z.number().nullable(),
    error_message: z.string().nullable(),
  })
  .transform((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    pageCount: d.page_count,
    errorMessage: d.error_message,
  }));

export const docPackIngestStatusSchema = z
  .object({
    pack_id: z.string(),
    total: z.number(),
    processed: z.number(),
    failed: z.number(),
    pending: z.number(),
    is_complete: z.boolean(),
    documents: z.array(documentIngestStatusItemSchema),
  })
  .transform((s) => ({
    packId: s.pack_id,
    total: s.total,
    processed: s.processed,
    failed: s.failed,
    pending: s.pending,
    isComplete: s.is_complete,
    documents: s.documents,
  }));

export const audiencePreviewSchema = z
  .object({
    count: z.number(),
    sample_names: z.array(z.string()),
  })
  .transform((a) => ({
    count: a.count,
    sampleNames: a.sample_names,
  }));

export type DocPackDocument = z.infer<typeof docPackDocumentSchema>;
export type DocPackListItem = z.infer<typeof docPackListItemSchema>;
export type DocPack = z.infer<typeof docPackSchema>;
export type DocumentIngestStatusItem = z.infer<typeof documentIngestStatusItemSchema>;
export type DocPackIngestStatus = z.infer<typeof docPackIngestStatusSchema>;
export type AudiencePreview = z.infer<typeof audiencePreviewSchema>;
