import { z } from "zod";

const serverConfigSchema = z.object({
  BACKEND_API_BASE_URL: z.url().default("http://localhost:8000"),
  /** Comma-separated emails allowed to open /admin and provision tenants. */
  PLATFORM_ADMIN_EMAILS: z.string().default(""),
});

const publicConfigSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Onboard"),
});

// Empty string from Vercel env UI must not bypass `.default()` (zod only defaults on `undefined`).
const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.trim() || undefined;

const parsedServerConfig = serverConfigSchema.parse({
  BACKEND_API_BASE_URL: backendApiBaseUrl,
  PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
});

/**
 * Vercel serverless functions cannot reach a developer's laptop. Validate when the
 * backend URL is actually read — not at module load — so importing `publicConfig`
 * (e.g. root layout → `/_not-found`) does not fail `next build` on Vercel.
 */
function resolveBackendApiBaseUrl(): string {
  if (process.env.VERCEL === "1") {
    if (!backendApiBaseUrl) {
      throw new Error(
        "BACKEND_API_BASE_URL must be set on Vercel to your public FastAPI base URL (e.g. https://api.example.com).",
      );
    }
    if (/localhost|127\.0\.0\.1/i.test(backendApiBaseUrl)) {
      throw new Error(
        "BACKEND_API_BASE_URL points at localhost — Vercel serverless functions cannot reach your laptop. Set it to the deployed API URL.",
      );
    }
  }

  return parsedServerConfig.BACKEND_API_BASE_URL;
}

export const serverConfig = {
  get BACKEND_API_BASE_URL(): string {
    return resolveBackendApiBaseUrl();
  },
  PLATFORM_ADMIN_EMAILS: parsedServerConfig.PLATFORM_ADMIN_EMAILS,
};

export const publicConfig = publicConfigSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
