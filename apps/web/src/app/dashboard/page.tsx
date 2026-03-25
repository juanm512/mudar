"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { useSession } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc-client"

interface Calculation {
  id: string
  lat: number
  lng: number
  timeSeconds: number
  transport: string
  address: string | null
  createdAt: Date | string
}

const TRANSPORT_LABELS: Record<string, string> = {
  driving: "Auto",
  public_transport: "Transporte público",
  walking: "Caminando",
  cycling: "Bicicleta",
}

// ── Fila ─────────────────────────────────────────────────────────────────────
function CalculationRow({ calc }: { calc: Calculation }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="py-3 text-gray-600">
        {new Date(calc.createdAt).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="py-3 text-gray-800">
        {calc.address ? (
          <span title={calc.address} className="line-clamp-1">
            {calc.address}
          </span>
        ) : (
          <span className="text-gray-400">
            {calc.lat.toFixed(4)}, {calc.lng.toFixed(4)}
          </span>
        )}
      </td>
      <td className="py-3 text-gray-600">
        {Math.round(calc.timeSeconds / 60)} min
      </td>
      <td className="py-3 text-gray-600">
        {TRANSPORT_LABELS[calc.transport] ?? calc.transport.replace("_", " ")}
      </td>
    </tr>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
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

    orpc.tokens.balance(undefined).then(({ tokens }) => setTokens(tokens))
    orpc.user
      .history(undefined)
      .then(({ calculations }) =>
        setCalculations(calculations as Calculation[])
      )
  }, [session])

  if (isPending || !session) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8 h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
          {/* Skeleton tokens */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-2 h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
            <div className="mt-4 h-8 w-36 animate-pulse rounded-lg bg-gray-200" />
          </div>
          {/* Skeleton tabla */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-200" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
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
          <a
            href="/dashboard/tokens"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Comprar tokens →
          </a>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium">Dirección</th>
                    <th className="pb-3 font-medium">Tiempo</th>
                    <th className="pb-3 font-medium">Transporte</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((c) => (
                    <CalculationRow key={c.id} calc={c} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
