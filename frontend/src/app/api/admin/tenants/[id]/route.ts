import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { resolvePlatformAdmin } from "@/lib/platform-admin";

type RouteContext = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
}

/** Delete a tenant (Clerk Organization). Platform-admin only. */
export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await resolvePlatformAdmin();
  if (!admin) return forbidden();

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
  }

  const clerk = await clerkClient();
  try {
    await clerk.organizations.deleteOrganization(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
