/**
 * Client-side typed ids: `<prefix>_<uuid7-hex>` — the same shape the backend uses
 * (`onboard/core/common/ids.py`). These are only for values generated in the browser
 * (React list keys, local job tracking, unsaved draft rows); persisted entity ids always
 * come from the backend. Keeping the format identical means an id is self-describing
 * wherever it shows up — logs, dev tools, network payloads.
 *
 * UUIDv7 (RFC 9562) packs a millisecond timestamp in the high bits, so ids sort by
 * creation time — handy for stable, chronologically ordered React keys.
 */

/** Every client-generated id prefix lives here, so each id type stays distinct and greppable. */
export const ID_PREFIXES = {
  /** chat message rendered locally before/without a backend id */
  message: "msg",
  /** in-flight upload job tracked in the upload store */
  uploadJob: "job",
  /** unsaved draft (e.g. a new quiz question not yet persisted) */
  draft: "new",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/** RFC 9562 UUIDv7: 48-bit unix-ms timestamp + version/variant bits + 74 random bits, as 32 hex chars. */
function uuid7Hex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const timestampMs = Date.now();
  // 48-bit big-endian millisecond timestamp in the first 6 bytes.
  bytes[0] = (timestampMs / 2 ** 40) & 0xff;
  bytes[1] = (timestampMs / 2 ** 32) & 0xff;
  bytes[2] = (timestampMs / 2 ** 24) & 0xff;
  bytes[3] = (timestampMs / 2 ** 16) & 0xff;
  bytes[4] = (timestampMs / 2 ** 8) & 0xff;
  bytes[5] = timestampMs & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** Generate a `<prefix>_<uuid7-hex>` id, e.g. `typedId(ID_PREFIXES.message)` → `msg_0198f6a2...`. */
export function typedId(prefix: IdPrefix): string {
  return `${prefix}_${uuid7Hex()}`;
}

/**
 * True for a client-minted draft id (`new_…`) — the placeholder id on an optimistic row that
 * exists only in the cache and has no backend record yet. Such rows must never be linked or
 * navigated to (the id can't resolve on the backend → 404); render them non-interactive with a
 * "creating…" affordance until the `onSuccess`/invalidate swaps in the real persisted id.
 */
export function isDraftId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(`${ID_PREFIXES.draft}_`);
}
