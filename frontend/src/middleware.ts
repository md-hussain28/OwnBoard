import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isOrgSelectionRoute = createRouteMatcher(["/select-organization(.*)"]);
const isPlatformAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // API callers expect JSON. `auth.protect()` rewrites unauthenticated API hits to the HTML
  // 404 page (x-clerk-auth-reason: protect-rewrite), which looks like a missing route.
  if (isApiRoute) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Missing active org is fine here — backend `require_org` returns JSON 403.
    return;
  }

  const { orgId } = await auth.protect();

  // Superadmin manages tenants without needing an active org selected.
  if (isPlatformAdminRoute(request)) {
    return;
  }

  // Every domain in this app (policies, quizzes, assignments) is scoped to a Clerk organization, so a signed-in
  // user with no active org can't get any further than picking/creating one.
  if (!orgId && !isOrgSelectionRoute(request)) {
    return NextResponse.redirect(new URL("/select-organization", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
