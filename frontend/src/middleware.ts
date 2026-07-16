import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isOrgSelectionRoute = createRouteMatcher(["/select-organization(.*)"]);
const isPlatformAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const { orgId } = await auth.protect();

  // Superadmin manages tenants without needing an active org selected.
  if (isPlatformAdminRoute(request)) {
    return;
  }

  // Every domain in this app (policies, quizzes, assignments) is scoped to a Clerk organization, so a signed-in
  // user with no active org can't get any further than picking/creating one. API routes are exempt from the
  // redirect (callers expect JSON) — the backend's `require_org` dependency already 403s them without an org,
  // and `proxyRequest` forwards that as a JSON error.
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  if (!orgId && !isOrgSelectionRoute(request) && !isApiRoute) {
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
