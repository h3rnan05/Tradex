import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

const ROLE_PREFIXES: Record<string, string[]> = {
  admin: ["/admin"],
  maestro: ["/maestro"],
  alumno: ["/alumno"],
  sponsor: ["/sponsor"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "/dashboard") {
    return NextResponse.next();
  }

  const raw = request.cookies.get("tradex_session")?.value;
  // Sessions are stored in localStorage, not cookies, so we can only do
  // coarse protection in middleware. Fine-grained role checks happen
  // client-side. Redirect to login if a session cookie is explicitly absent;
  // otherwise let the page load (client will redirect if needed).
  // This middleware primarily guards prefetch & direct navigation.

  // We can't read localStorage in edge middleware, so we rely on a cookie
  // set by the client at login for edge-side checks.
  if (raw) {
    try {
      const session = JSON.parse(raw);
      const rol: string = session?.rol;

      for (const [role, prefixes] of Object.entries(ROLE_PREFIXES)) {
        if (prefixes.some((p) => pathname.startsWith(p)) && rol !== role) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
