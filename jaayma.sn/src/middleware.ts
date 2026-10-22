import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "jaay_session";
const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://madutech7-jaaymaa.hf.space"
    : "http://127.0.0.1:4000");

let cachedMaintenanceState: { enabled: boolean; expiresAt: number } | null = null;

async function isMaintenanceEnabled() {
  if (cachedMaintenanceState && cachedMaintenanceState.expiresAt > Date.now()) {
    return cachedMaintenanceState.enabled;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/admin/public-features`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return true;

    const features = (await response.json()) as { maintenanceEnabled?: unknown };
    const enabled = features.maintenanceEnabled === true;
    cachedMaintenanceState = { enabled, expiresAt: Date.now() + 3000 };
    return enabled;
  } catch {
    // Keep the public site in a safe state if its feature configuration cannot be read.
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export async function middleware(request: NextRequest) {
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

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isMaintenanceExempt =
    isAdminPath ||
    pathname === "/connexion" ||
    pathname === "/maintenance" ||
    pathname === "/api/cron/keepalive" ||
    pathname === "/api/admin/analytics/realtime";
  if (!isMaintenanceExempt && await isMaintenanceEnabled()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Le site est temporairement en maintenance." },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, max-age=0",
            "Cloudflare-CDN-Cache-Control": "no-store",
            "Retry-After": "60",
          },
        },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    return NextResponse.rewrite(url, {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Cloudflare-CDN-Cache-Control": "no-store",
        "Retry-After": "60",
      },
    });
  }

  const response = NextResponse.next();

  // En-têtes de sécurité de base pour toutes les réponses frontend
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

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
  // Keep framework assets and static files out of the page gate.
  matcher: [
    "/((?!_next/|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html|robots.txt|sitemap.xml).*)",
  ],
};
