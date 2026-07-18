import type { ReactNode } from "react";
import { ProjectLayoutShell } from "@/components/project";

/**
 * Await params on the server so the Promise never crosses into the client tree
 * (avoids Next.js sync-params enumeration warnings on client layouts).
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectLayoutShell id={id}>{children}</ProjectLayoutShell>;
}
