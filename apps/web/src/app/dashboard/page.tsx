"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { signOut, useSession } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc-client"

interface Calculation {
  id: string
  lat: number
  lng: number
  timeSeconds: number
  transport: string
  createdAt: Date | string
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [tokens, setTokens] = useState<number | null>(null)
  const [calculations, setCalculations] = useState<Calculation[]>([])

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return

    orpc.user.tokens(undefined).then(({ tokens }) => setTokens(tokens))
    orpc.user.history(undefined).then(({ calculations }) => setCalculations(calculations as Calculation[]))
  }, [session])

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
  }

  if (isPending || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            Mudar
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session.user.email}</span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Tu cuenta</h1>

        {/* Tokens */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-medium text-gray-500">
            Tokens disponibles
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-primary">
              {tokens === null ? "—" : tokens}
            </span>
            <span className="text-sm text-gray-500">cálculos restantes</span>
          </div>
          <button
            disabled
            className="mt-4 rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            Comprar tokens (próximamente)
          </button>
        </div>

        {/* Historial */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Historial de cálculos
          </h2>
          {calculations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="mb-3 text-4xl">📊</div>
              <p className="text-sm">
                Todavía no realizaste ningún cálculo de isócrona
              </p>
              <p className="mt-1 text-xs text-gray-300">
                Instalá la extensión del navegador para comenzar
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Coordenadas</th>
                  <th className="pb-3 font-medium">Tiempo</th>
                  <th className="pb-3 font-medium">Transporte</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 py-2">
                    <td className="py-3 text-gray-600">
                      {new Date(c.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-3 text-gray-600">
                      {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                    </td>
                    <td className="py-3 text-gray-600">
                      {Math.round(c.timeSeconds / 60)} min
                    </td>
                    <td className="py-3 text-gray-600 capitalize">
                      {c.transport.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
