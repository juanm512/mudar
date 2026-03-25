import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <p className="mb-2 text-5xl font-extrabold text-gray-200">404</p>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          Página no encontrada
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
