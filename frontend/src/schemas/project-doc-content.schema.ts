import { z } from "zod";

/** Ordered extracted text for one project document — rendered in the citation viewer sheet. */
export const docContentChunkSchema = z
  .object({
    chunk_index: z.number(),
    content: z.string(),
    page_start: z.number().nullable().optional(),
    page_end: z.number().nullable().optional(),
    section_title: z.string().nullable().optional(),
  })
  .transform((c) => ({
    chunkIndex: c.chunk_index,
    content: c.content,
    pageStart: c.page_start ?? null,
    pageEnd: c.page_end ?? null,
    sectionTitle: c.section_title ?? null,
  }));

export const docContentSchema = z
  .object({
    document_id: z.string(),
    title: z.string(),
    file_type: z.string().nullable().optional(),
    chunks: z.array(docContentChunkSchema),
  })
  .transform((d) => ({
    documentId: d.document_id,
    title: d.title,
    fileType: d.file_type ?? null,
    chunks: d.chunks,
  }));

export type DocContent = z.infer<typeof docContentSchema>;
export type DocContentChunk = DocContent["chunks"][number];
