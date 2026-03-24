import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthClient } from "better-auth/client"

import { db } from "@mudar/db"
import * as authSchema from "@mudar/db/auth-schema"

import { env } from "./env"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS
    ? env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // actualizar cada 24hs
  },
})

export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL,
})

// Tipos de sesión compartidos
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
