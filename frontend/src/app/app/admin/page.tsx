import { redirect } from "next/navigation";
import { TenantAdminPanel } from "@/components/admin/tenant-admin-panel";
import { resolvePlatformAdmin } from "@/lib/platform-admin";

export default async function AdminPage() {
  const admin = await resolvePlatformAdmin();
  if (!admin) {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Superadmin</h1>
        <p className="text-muted-foreground">
          Create and manage tenants. Signed in as {admin.email}.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tip: in Clerk Dashboard → Organizations, turn off &quot;Allow user-created
          organizations&quot; so only superadmin can create tenants.
        </p>
      </div>
      <TenantAdminPanel />
    </div>
  );
}
