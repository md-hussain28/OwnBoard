import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isOrgSelectionRoute = createRouteMatcher(["/select-organization(.*)"]);
const isPlatformAdminRoute = createRouteMatcher(["/app/admin(.*)", "/api/admin(.*)"]);
const isAppRoute = createRouteMatcher(["/app(.*)"]);

/** Old console URLs → `/app/*` (landing took over `/`). */
const LEGACY_APP_PREFIXES = [
  "/dashboard",
  "/doc-packs",
  "/onboarding",
  "/chat",
  "/team",
  "/admin",
  "/settings",
] as const;

function redirectLegacyAppPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  for (const prefix of LEGACY_APP_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = `/app${pathname}`;
      return NextResponse.redirect(url);
    }
  }
  return null;
}

function redirectIfMissingOrg(
  request: NextRequest,
  orgId: string | null | undefined,
): NextResponse | null {
  if (orgId || isOrgSelectionRoute(request)) {
    return null;
  }
  return NextResponse.redirect(new URL("/select-organization", request.url));
}

export default clerkMiddleware(async (auth, request) => {
  const legacy = redirectLegacyAppPath(request);
  if (legacy) {
    return legacy;
  }

  if (isPublicRoute(request)) {
    return;
  }

  // API callers expect JSON. `auth.protect()` rewrites unauthenticated API hits to the HTML
  // 404 page (x-clerk-auth-reason: protect-rewrite), which looks like a missing route.
  if (request.nextUrl.pathname.startsWith("/api")) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Missing active org is fine here — backend `require_org` returns JSON 403.
    return;
  }

  // Console under `/app` — send signed-out users to sign-in (not Clerk's protect 404 rewrite).
  if (isAppRoute(request)) {
    const { userId, orgId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: request.url });
    }
    if (isPlatformAdminRoute(request)) {
      return;
    }
    return redirectIfMissingOrg(request, orgId) ?? undefined;
  }

  const { orgId } = await auth.protect();

  // Superadmin manages tenants without needing an active org selected.
  if (isPlatformAdminRoute(request)) {
    return;
  }

  // Every domain in this app (policies, quizzes, assignments) is scoped to a Clerk organization, so a signed-in
  // user with no active org can't get any further than picking/creating one.
  return redirectIfMissingOrg(request, orgId) ?? undefined;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
