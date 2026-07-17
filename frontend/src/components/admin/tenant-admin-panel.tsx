"use client";

import { useState } from "react";
import { useCreateTenant, useDeleteTenant } from "@/hooks/queries/admin/admin.mutations";
import { useTenants } from "@/hooks/queries/admin/admin.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

export function TenantAdminPanel() {
  const { data: tenants, isLoading, isError, error } = useTenants();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();

  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormMessage(null);
    if (!name.trim() || !adminEmail.trim()) return;

    createTenant.mutate(
      {
        name: name.trim(),
        adminEmail: adminEmail.trim(),
        ...(slug.trim() ? { slug: slug.trim() } : {}),
      },
      {
        onSuccess: (result) => {
          setName("");
          setAdminEmail("");
          setSlug("");
          if (result.invitationError) {
            setFormMessage(
              `Tenant "${result.name}" created, but invite failed: ${result.invitationError}`,
            );
          } else {
            setFormMessage(`Tenant "${result.name}" created. Invite sent to ${result.adminEmail}.`);
          }
        },
        onError: (err) => {
          setFormMessage(getApiErrorMessage(err, "Failed to create tenant"));
        },
      },
    );
  }

  function handleDelete(id: string, tenantName: string) {
    if (!window.confirm(`Delete tenant "${tenantName}"? This cannot be undone.`)) return;
    deleteTenant.mutate(id, {
      onError: (err) => {
        setFormMessage(getApiErrorMessage(err, "Failed to delete tenant"));
      },
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create tenant</CardTitle>
          <CardDescription>
            Provisions a Clerk organization and invites one email as org admin. That person signs in
            with their own password and can invite teammates from there.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-1">
              <label htmlFor="tenant-name" className="text-xs font-medium">
                Tenant name
              </label>
              <Input
                id="tenant-name"
                placeholder="Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label htmlFor="tenant-slug" className="text-xs font-medium">
                Slug (optional)
              </label>
              <Input
                id="tenant-slug"
                placeholder="acme-corp"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="tenant-admin-email" className="text-xs font-medium">
                Tenant admin email
              </label>
              <Input
                id="tenant-admin-email"
                type="email"
                placeholder="admin@acme.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending ? "Creating..." : "Create tenant & invite admin"}
              </Button>
            </div>
          </form>
          {formMessage && <p className="mt-3 text-sm text-muted-foreground">{formMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>All organizations on this Clerk instance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-muted-foreground">
              Could not load tenants ({getApiErrorMessage(error)}).
            </p>
          )}

          {!isLoading && !isError && tenants?.length === 0 && (
            <p className="text-sm text-muted-foreground">No tenants yet.</p>
          )}

          {!isLoading && !isError && tenants && tenants.length > 0 && (
            <ul className="space-y-2">
              {tenants.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {tenant.slug ?? tenant.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{tenant.membersCount} members</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteTenant.isPending}
                      onClick={() => handleDelete(tenant.id, tenant.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
