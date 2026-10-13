import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "jaay_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect the /espace and /admin routes and all sub-routes
  if (pathname.startsWith("/espace") || pathname.startsWith("/admin")) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from connexion/inscription
  if (pathname === "/connexion" || pathname === "/inscription") {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

    if (sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/espace";
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
  const isPublicShopPage =
    /^\/[^/.]+$/.test(pathname) &&
    !["espace", "admin", "connexion", "inscription", "api", "_next"].includes(firstSegment);

  // Product catalog and shop pages are public. A short edge TTL absorbs repeat
  // visits without caching authenticated seller pages or delaying edits for long.
  if (request.method === "GET" && (pathname === "/explorer" || isPublicShopPage)) {
    response.headers.set("Cache-Control", "public, max-age=0");
    response.headers.set(
      "Cloudflare-CDN-Cache-Control",
      "public, max-age=15, stale-while-revalidate=30, stale-if-error=3600"
    );
  }

  return response;
}

export const config = {
  // Apply middleware to specific routes only for performance
  matcher: [
    "/espace/:path*",
    "/admin/:path*",
    "/connexion",
    "/inscription",
    "/explorer",
    "/:shopSlug",
  ],
};
