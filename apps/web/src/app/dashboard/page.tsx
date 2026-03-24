import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Dashboard — Mudar",
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            Mudar
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-gray-500">tu@email.com</span>
            <button className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
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
            <span className="text-4xl font-bold text-primary">10</span>
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
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="mb-3 text-4xl">📊</div>
            <p className="text-sm">
              Todavía no realizaste ningún cálculo de isócrona
            </p>
            <p className="mt-1 text-xs text-gray-300">
              Instalá la extensión del navegador para comenzar
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
