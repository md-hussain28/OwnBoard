"use client";

import { AdminHome } from "@/components/home/admin-home";
import { MemberHome } from "@/components/home/member-home";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { Skeleton } from "@/ui/skeleton";

export default function AppHomePage() {
  const { isAdmin, isLoading } = useAppRole();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // Team leads / admins get the "is everyone okay, anything at risk?" console.
  // Everyone else gets the calm "here's your next step" home.
  return isAdmin ? <AdminHome /> : <MemberHome />;
}
