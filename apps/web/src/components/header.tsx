"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { signOut, useSession } from "@/lib/auth-client"

export function Header() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-primary">
          Mudarg
        </Link>
        <nav className="flex items-center gap-4">
          {isPending ? (
            <div className="flex animate-pulse items-center gap-4">
              <div className="h-4 w-20 rounded bg-gray-200"></div>
              <div className="h-8 w-24 rounded-lg bg-gray-200"></div>
            </div>
          ) : session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-primary"
              >
                Dashboard
              </Link>
              <span className="text-sm text-gray-500">{session.user.email}</span>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-700 hover:text-primary"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
