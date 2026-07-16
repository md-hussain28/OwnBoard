import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { resolvePlatformAdmin } from "@/lib/platform-admin";

const createTenantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  adminEmail: z.string().trim().email(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens")
    .optional(),
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `tenant-${Date.now().toString(36)}`;
}

function forbidden() {
  return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
}

/** List all Clerk organizations (tenants). Platform-admin only — talks to Clerk, not FastAPI. */
export async function GET() {
  const admin = await resolvePlatformAdmin();
  if (!admin) return forbidden();

  const clerk = await clerkClient();
  const { data } = await clerk.organizations.getOrganizationList({
    limit: 100,
    orderBy: "-created_at",
  });

  const tenants = data.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    membersCount: org.membersCount ?? 0,
    createdAt: new Date(org.createdAt).toISOString(),
  }));

  return NextResponse.json(tenants);
}

/**
 * Create a tenant (Clerk Organization) and invite one email as org:admin.
 * The platform admin becomes a temporary co-admin via `createdBy` (Clerk requires a creator).
 */
export async function POST(request: Request) {
  const admin = await resolvePlatformAdmin();
  if (!admin) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, adminEmail } = parsed.data;
  const slug = parsed.data.slug ?? slugify(name);
  const clerk = await clerkClient();

  let organization;
  try {
    organization = await clerk.organizations.createOrganization({
      name,
      slug,
      createdBy: admin.userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  let invitationId: string | null = null;
  let invitationError: string | null = null;

  try {
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: organization.id,
      inviterUserId: admin.userId,
      emailAddress: adminEmail.toLowerCase(),
      role: "org:admin",
      redirectUrl: `${origin}/sign-in`,
    });
    invitationId = invitation.id;
  } catch (err) {
    invitationError = err instanceof Error ? err.message : "Failed to send invitation";
  }

  return NextResponse.json(
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      membersCount: organization.membersCount ?? 1,
      createdAt: new Date(organization.createdAt).toISOString(),
      adminEmail: adminEmail.toLowerCase(),
      invitationId,
      invitationError,
    },
    { status: 201 },
  );
}
