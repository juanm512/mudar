import { os, ORPCError } from "@orpc/server"
import { auth } from "@mudar/auth"

// Contexto inicial que el handler de Next.js debe proveer
export const base = os.$context<{ headers: Headers }>()

// Middleware de autenticación — patrón oficial oRPC + better-auth
export const authMiddleware = base.middleware(async ({ context, next }) => {
  const sessionData = await auth.api.getSession({
    headers: context.headers,
  })

  if (!sessionData?.session || !sessionData?.user) {
    throw new ORPCError("UNAUTHORIZED")
  }

  return next({
    context: {
      session: sessionData.session,
      user: sessionData.user,
    },
  })
})

// Base procedure autenticada para usar en el router
export const authedProcedure = base.use(authMiddleware)
