import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { serverConfig } from "@/lib/api";

/** Comma-separated emails from `PLATFORM_ADMIN_EMAILS`, lowercased and trimmed. */
export function platformAdminEmails(): Set<string> {
  return new Set(
    serverConfig.PLATFORM_ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Resolves whether the current session belongs to a superadmin.
 * Returns `{ userId, email }` on success; `null` if unauthenticated or not allowlisted.
 */
export async function resolvePlatformAdmin(): Promise<{ userId: string; email: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!isPlatformAdminEmail(email)) return null;

  return { userId, email: email! };
}
