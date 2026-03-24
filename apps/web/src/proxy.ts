// Next.js 16 usa proxy.ts en lugar de middleware.ts
// El rename clarifica el network boundary — runtime Node.js
// Ref: https://nextjs.org/blog/next-16

import { type NextRequest, NextResponse } from "next/server"

import { auth } from "@mudar/auth"

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    const signInUrl = new URL("/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
