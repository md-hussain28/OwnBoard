import { CompassIcon, HomeIcon, LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { AtmosphereBlobs } from "@/components/layout";
import { StatusScreen } from "@/components/shared";
import { APP_HOME } from "@/lib";
import { Button } from "@/ui";

/**
 * Global 404 — App Router renders this for any unmatched URL. It sits inside the root layout
 * (providers, fonts) but outside the console shell, so it works for signed-out visitors too.
 */
export default function NotFound() {
  return (
    <main className="relative">
      <AtmosphereBlobs />
      <StatusScreen
        code="404"
        tone="warning"
        icon={<CompassIcon aria-hidden />}
        title="We couldn’t find that page"
        description="The link may be broken, or the page may have been moved. Let’s get you back to somewhere useful."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/">
                <HomeIcon aria-hidden />
                Back to home
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href={APP_HOME}>
                <LayoutDashboardIcon aria-hidden />
                Open the app
              </Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
