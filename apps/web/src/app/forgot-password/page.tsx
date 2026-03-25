"use client"

import Link from "next/link"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement).value

    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    })

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Recuperar contraseña
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-700">
            Si el email está registrado, recibirás un enlace en breve. Revisá
            también tu carpeta de spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
