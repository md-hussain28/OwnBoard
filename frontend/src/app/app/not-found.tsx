import { CompassIcon, LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { StatusScreen } from "@/components/shared";
import { APP_HOME } from "@/lib";
import { Button } from "@/ui";

/**
 * Console 404 — handles `notFound()` and unmatched routes under `/app`. Renders inside the
 * app shell (sidebar/topbar stay), so the user keeps their navigation and never feels stranded.
 */
export default function ConsoleNotFound() {
  return (
    <StatusScreen
      contained
      code="404"
      tone="warning"
      icon={<CompassIcon aria-hidden />}
      title="This page doesn’t exist"
      description="The item may have been removed, or the link is out of date. Head back to your dashboard to keep going."
      actions={
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link href={APP_HOME}>
            <LayoutDashboardIcon aria-hidden />
            Go to dashboard
          </Link>
        </Button>
      }
    />
  );
}
