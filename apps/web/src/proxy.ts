// Next.js 16 usa proxy.ts en lugar de middleware.ts
// El rename clarifica el network boundary — runtime Node.js
// Ref: https://nextjs.org/blog/next-16

import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  // Rutas protegidas que requieren autenticación
  const protectedPaths = ["/dashboard"]
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected) {
    // TODO: verificar sesión con better-auth
    // Por ahora, permitir acceso libre
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
