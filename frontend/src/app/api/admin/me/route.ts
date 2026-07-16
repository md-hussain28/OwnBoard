import { NextResponse } from "next/server";
import { resolvePlatformAdmin } from "@/lib/platform-admin";

/** Returns whether the signed-in user is a platform superadmin (email allowlist). */
export async function GET() {
  const admin = await resolvePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ isPlatformAdmin: false }, { status: 200 });
  }
  return NextResponse.json({ isPlatformAdmin: true, email: admin.email });
}
