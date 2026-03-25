import { betterAuth } from "better-auth"
import { emailHarmony } from "better-auth-harmony"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthClient } from "better-auth/client"
import { Resend } from "resend"

import { db } from "@mudar/db"
import * as authSchema from "@mudar/db/auth-schema"

import { env } from "./env"

const EMAIL_TO = "512juanm@gmail.com"

const resend = new Resend(env.RESEND_API_KEY)

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS
    ? env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
    : [
        "http://localhost:3001",
        // Extensiones de Chrome (desarrollo)
        "chrome-extension://",
      ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: env.NODE_ENV === "development" ? EMAIL_TO : user.email,
        subject: "Restablecer contraseña — Mudarg",
        html: `<p>Hola,</p><p>Hacé click en el siguiente enlace para restablecer tu contraseña. El enlace expira en 1 hora.</p><p><a href="${url}">Restablecer contraseña</a></p><p>Si no solicitaste esto, ignorá este mensaje.</p>`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    callbackURL: "/dashboard",
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: env.NODE_ENV === "development" ? EMAIL_TO : user.email,
        subject: "Verificá tu email — Mudarg",
        html: `<p>Hola ${user.name},</p><p>Hacé click en el siguiente enlace para verificar tu cuenta:</p><p><a href="${url}">Verificar email</a></p>`,
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // actualizar cada 24hs
  },
  plugins: [
    emailHarmony(),
  ],
})

export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL,
})

// Tipos de sesión compartidos
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
