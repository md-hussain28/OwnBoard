// biome-ignore-all lint/performance/noBarrelFile: intentional per-folder public API so this directory imports as `@/<dir>`.

export * from "./api-client";
export * from "./config";
export * from "./endpoint";
export * from "./errors";

// Note: `./backend-client` and `./proxy` are server-only (`import "server-only"`).
// They are intentionally NOT re-exported here — this barrel is imported by client
// components, and re-exporting server-only modules poisons the client bundle.
// Import them directly from "@/lib/api/proxy" / "@/lib/api/backend-client" in server code.
