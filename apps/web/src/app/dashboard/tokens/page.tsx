"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

import { useSession } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc-client"

interface TokenPack {
  id: string
  name: string
  tokens: number
  priceArs: number
  active: boolean
}

interface TokenTransaction {
  id: string
  amount: number
  reason: string
  orderId: string | null
  createdAt: Date | string
}

const REASON_LABELS: Record<string, string> = {
  initial_grant: "Bienvenida",
  purchase: "Compra",
  isochrone: "Isócrona",
  bonus: "Bonus",
  refund: "Reembolso",
}

function formatArs(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export default function TokensPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()
  const [balance, setBalance] = useState<number | null>(null)
  const [packs, setPacks] = useState<TokenPack[]>([])
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const paymentStatus = searchParams.get("payment")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
    }
  }, [session, isPending, router])

  const loadData = useCallback(() => {
    if (!session) return
    orpc.tokens.balance(undefined).then(({ tokens }) => setBalance(tokens))
    orpc.tokens.packs(undefined).then(({ packs }) => setPacks(packs as TokenPack[]))
    orpc.tokens.history(undefined).then(({ transactions }) =>
      setTransactions(transactions as TokenTransaction[])
    )
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  async function handlePurchase(packId: string) {
    setPurchasing(packId)
    try {
      const { checkoutUrl } = await orpc.tokens.purchase({ packId })
      window.location.href = checkoutUrl
    } catch (err) {
      console.error("Purchase failed:", err)
      setPurchasing(null)
    }
  }

  if (isPending || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando...</p>
      </main>
    )
  }

  // Running balance for the history table
  let runningBalance = 0
  const transactionsWithBalance = transactions.map((t) => {
    runningBalance += t.amount
    return { ...t, runningBalance }
  })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <a href="/dashboard" className="hover:text-primary transition-colors">
            ← Tu cuenta
          </a>
        </nav>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Token Store</h1>
        <p className="mb-8 text-sm text-gray-500">
          Comprá packs de tokens para calcular isócronas con auto, bici y transporte público.
        </p>

        {/* Current balance */}
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-primary">
              {balance === null ? "—" : balance}
            </span>
            <span className="text-sm text-gray-500">tokens disponibles</span>
          </div>
        </div>

        {/* Mensajes de estado del pago */}
        {paymentStatus === "success" && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ Pago recibido. Los tokens serán acreditados en instantes.
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            El pago fue cancelado. Podés intentarlo nuevamente cuando quieras.
          </div>
        )}
        {paymentStatus === "pending" && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Pago en proceso. Los tokens serán acreditados cuando se confirme.
          </div>
        )}

        {/* Packs grid */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => {
            const isPro = pack.name === "Búsqueda completa"
            return (
              <div
                key={pack.id}
                className={`relative flex flex-col rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
                  isPro
                    ? "border-primary bg-white ring-2 ring-primary/20"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                    Más popular
                  </span>
                )}

                <h3 className="text-lg font-bold text-gray-900">{pack.name}</h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {pack.tokens}
                  </span>
                  <span className="text-sm text-gray-500">tokens</span>
                </div>

                <p className="mt-2 text-2xl font-semibold text-primary">
                  {formatArs(pack.priceArs)}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {formatArs(Math.round(pack.priceArs / pack.tokens))} por token
                </p>

                <button
                  className={`mt-auto w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                    isPro
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={purchasing !== null}
                  onClick={() => handlePurchase(pack.id)}
                >
                  {purchasing === pack.id ? "Redirigiendo..." : "Comprar"}
                </button>
              </div>
            )
          })}

          {packs.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-12 text-gray-400">
              <p className="text-sm">Cargando packs...</p>
            </div>
          )}
        </div>

        {/* Transaction history */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Historial de movimientos
          </h2>

          {transactionsWithBalance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="mb-3 text-4xl">📋</div>
              <p className="text-sm">No hay movimientos de tokens todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium">Movimiento</th>
                    <th className="pb-3 font-medium">Razón</th>
                    <th className="pb-3 font-medium text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {[...transactionsWithBalance].reverse().map((t) => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="py-3 text-gray-600">
                        {new Date(t.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-semibold ${
                            t.amount > 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {t.amount > 0 ? `+${t.amount}` : t.amount}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">
                        {REASON_LABELS[t.reason] ?? t.reason}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-700">
                        {t.runningBalance}
                      </td>
                    </tr>
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
