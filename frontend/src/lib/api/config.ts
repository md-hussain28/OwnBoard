import { z } from "zod";

const serverConfigSchema = z.object({
  BACKEND_API_BASE_URL: z.url().default("http://localhost:8000"),
  /** Comma-separated emails allowed to open /admin and provision tenants. */
  PLATFORM_ADMIN_EMAILS: z.string().default(""),
});

const publicConfigSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Onboard"),
});

export const serverConfig = serverConfigSchema.parse({
  BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
  PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
});

export const publicConfig = publicConfigSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
