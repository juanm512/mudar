// Next.js 16 usa proxy.ts en lugar de middleware.ts
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@mudar/auth"

// Orígenes permitidos para CORS (extensión + desarrollo local)
const CORS_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^chrome-extension:\/\//,
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !CORS_PATTERNS.some((r) => r.test(origin))) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cors = getCorsHeaders(request.headers.get("origin"))

  // Preflight CORS
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 204, headers: cors })
  }

  // Añadir CORS a todas las respuestas /api/*
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next()
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // Auth guard para /dashboard
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}
