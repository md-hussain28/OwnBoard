import { z } from "zod";

export const ingestKeySchema = z
  .object({
    id: z.string(),
    repoId: z.string().optional(),
    repo_id: z.string().optional(),
    keyPrefix: z.string().optional(),
    key_prefix: z.string().optional(),
    lastUsedAt: z.string().nullable().optional(),
    last_used_at: z.string().nullable().optional(),
    revokedAt: z.string().nullable().optional(),
    revoked_at: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
    // Present only in the create response — the plaintext token, shown once.
    token: z.string().nullable().optional(),
  })
  .transform((raw) => ({
    id: raw.id,
    repoId: raw.repoId ?? raw.repo_id ?? "",
    keyPrefix: raw.keyPrefix ?? raw.key_prefix ?? "",
    lastUsedAt: raw.lastUsedAt ?? raw.last_used_at ?? null,
    revokedAt: raw.revokedAt ?? raw.revoked_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    token: raw.token ?? null,
  }));

export const ingestKeyListSchema = z.array(ingestKeySchema);

export type IngestKey = z.infer<typeof ingestKeySchema>;
