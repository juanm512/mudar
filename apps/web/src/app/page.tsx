import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        {/* Hero */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Ahora en Argentina
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Buscá propiedades por{" "}
          <span className="text-primary">tiempo de viaje</span>
        </h1>

        <p className="mb-10 text-lg text-gray-600 sm:text-xl">
          Mudar te ayuda a encontrar tu próximo hogar usando isócronas.
          Definí un punto, un tiempo de viaje y un medio de transporte —
          te mostramos solo las propiedades que están dentro de tu alcance.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Features placeholder */}
        <div className="mt-20 grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">🗺️</div>
            <h3 className="mb-2 font-semibold text-gray-900">Isócronas</h3>
            <p className="text-sm text-gray-500">
              Zonas de alcance basadas en tiempo real de viaje
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">🏠</div>
            <h3 className="mb-2 font-semibold text-gray-900">
              Extensión de navegador
            </h3>
            <p className="text-sm text-gray-500">
              Filtrá propiedades en ArgenProp y ZonaProp directamente
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">⚡</div>
            <h3 className="mb-2 font-semibold text-gray-900">Freemium</h3>
            <p className="text-sm text-gray-500">
              Tokens gratuitos para empezar, comprá más cuando necesites
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
