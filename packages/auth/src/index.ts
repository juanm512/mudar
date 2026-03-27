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

function emailLayout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="background-color:#2563eb;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Mudarg</p>
              <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe;">Buscá propiedades por tiempo de viaje</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">${body}</td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                Este es un mensaje automático de Mudarg. Por favor no respondas este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(url: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
    <tr>
      <td style="background-color:#2563eb;border-radius:8px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;text-align:center;">O copiá este enlace en tu navegador:</p>
  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;word-break:break-all;">
    <a href="${url}" style="color:#2563eb;text-decoration:none;">${url}</a>
  </p>`
}

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
      const firstName = user.name.split(" ")[0]
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: env.NODE_ENV === "development" ? EMAIL_TO : user.email,
        subject: "Restablecer contraseña — Mudarg",
        html: emailLayout(
          "Restablecer contraseña",
          `<p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Restablecer contraseña</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            Hola, ${firstName}. Recibimos una solicitud para restablecer la contraseña de tu cuenta en Mudar.
            El enlace expira en <strong>1 hora</strong>.
          </p>
          ${ctaButton(url, "Restablecer contraseña")}
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
            Si no solicitaste restablecer tu contraseña, ignorá este mensaje. Tu cuenta está segura.
          </p>`,
        ),
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    callbackURL: "/dashboard",
    sendVerificationEmail: async ({ user, url }) => {
      const firstName = user.name.split(" ")[0]
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: env.NODE_ENV === "development" ? EMAIL_TO : user.email,
        subject: "Verificá tu email — Mudarg",
        html: emailLayout(
          "Verificá tu email",
          `<p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Hola, ${firstName} 👋</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            Gracias por registrarte en Mudar. Solo falta un paso: confirmá tu dirección de email para activar tu cuenta.
            El enlace expira en <strong>24 horas</strong>.
          </p>
          ${ctaButton(url, "Verificar mi email")}
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
            Si no creaste una cuenta en Mudar, podés ignorar este mensaje.
          </p>`,
        ),
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // actualizar cada 24hs
  },
  rateLimit: {
    window: 60 * 15,  // 15 minutos
    max: 10,           // 10 intentos por ventana por IP
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
