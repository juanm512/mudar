import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mudarg — Buscá propiedades por tiempo de viaje",
  description: "Una extensión de navegador que suma datos útiles directamente al mapa para que encuentres tu hogar más rápido.",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-white text-gray-900 scroll-smooth">
      {/* 1. Hero Section */}
      <section className="w-full max-w-6xl px-6 py-20 pb-16 pt-32 text-center md:py-32">
        <div className="mx-auto mb-6 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm transition-transform hover:scale-105">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          Disponible para Chrome y Edge
        </div>

        <h1 className="mx-auto mb-6 max-w-4xl animate-fade-in-up text-5xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
          El mapa de propiedades, <span className="text-blue-600">como debería ser</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl animate-fade-in-up text-lg text-gray-600 sm:text-xl md:mb-12">
          Mudarg enriquece tu búsqueda en portales inmobiliarios. Mirá datos clave de viaje y transporte directamente en el mapa sin tener que abrir decenas de pestañas.
        </p>

        <div className="flex animate-fade-in-up flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl sm:w-auto"
          >
            Instalar extensión gratis
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {/* Hero Image / Mockup Placeholder */}
        <div className="relative mt-16 mx-auto max-w-5xl animate-fade-in-up rounded-2xl border border-gray-200 bg-gray-50 p-2 shadow-2xl transition-all hover:shadow-blue-900/10 sm:mt-24 sm:p-4">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-200 relative group">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white/50 pattern-grid-lg">
              <span className="text-xl font-medium">📸 Mockup: Mapa Antes vs Mapa Después</span>
            </div>
            {/* Overlay hint */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 flex items-end p-6 opacity-0 transition-opacity group-hover:opacity-100">
               <span className="text-white font-medium">Así se ve la extensión en acción</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Demo Section */}
      <section className="w-full bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Navegá más rápido y mejor
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Transformá la experiencia de buscar alquiler o compra con datos que importan.
            </p>
          </div>
          
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 shadow-xl bg-white aspect-[16/9] flex items-center justify-center">
              <span className="text-gray-400 font-medium">🎥 Video / GIF interactivo demostrando la extensión</span>
          </div>
        </div>
      </section>

      {/* 3. Problem / Solution */}
      <section className="w-full py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Buscar departamento no debería ser un trabajo de tiempo completo
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">El problema actual</h3>
                    <p className="mt-1 text-gray-600">Perdés horas abriendo cada propiedad en una pestaña nueva, copiando la dirección y calculando cuánto tardás al trabajo en Google Maps.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">La solución con Mudarg</h3>
                    <p className="mt-1 text-gray-600">Ves el tiempo de viaje directo en el mapa de Argenprop sin salir de la página. Minimizás la fricción y comparás al instante.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative aspect-square md:aspect-auto md:h-full w-full rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200">
               <span className="text-gray-400 font-medium px-4 text-center">🖼️ Captura de pantalla: Una vista de propiedad limpia con métricas de Mudarg</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section className="w-full bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Todo lo que necesitás, en un solo lugar
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-gray-100">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Tiempo de viaje</h3>
              <p className="text-gray-600">Descubrí exactamente cuánto tardás a tu oficina o facultad desde cada propiedad.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="group rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-gray-100">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Mapa enriquecido</h3>
              <p className="text-gray-600">Visualizá isócronas y zonas de alcance en el mapa que ya estás usando.</p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-gray-100">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Filtros rápidos</h3>
              <p className="text-gray-600">Remové de la lista cualquier propiedad que no cumpla tus expectativas de zona.</p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. How it works */}
      <section className="w-full py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Empezá a usarlo en 3 clics
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold border-4 border-white shadow-lg text-white">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Instalá la extensión</h3>
              <p className="text-gray-600">Agregá Mudarg a tu navegador en segundos, totalmente gratis.</p>
            </div>
            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold border-4 border-white shadow-lg text-white">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Abrí Argenprop</h3>
              <p className="text-gray-600">Navegá tus portales favoritos como lo hacés siempre.</p>
            </div>
            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold border-4 border-white shadow-lg text-white">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Explorá mejorado</h3>
              <p className="text-gray-600">Mirá cómo los datos útiles aparecen mágicamente sobre el mapa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Section */}
      <section className="w-full bg-blue-600 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Listo para encontrar piso más rápido?
          </h2>
          <p className="mb-10 text-lg text-blue-100">
            Unite a los usuarios que ya están ahorrando horas de búsqueda en portales inmobiliarios.
          </p>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-md transition-all hover:scale-105 hover:bg-gray-50"
          >
            Instalar extensión gratis
          </a>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="w-full border-t border-gray-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">Mudarg</span>
            <span className="text-sm text-gray-500">© 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
             <Link href="/terms" className="hover:text-blue-600 transition-colors">Términos</Link>
             <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacidad</Link>
             <a href="mailto:hola@mudarg.com" className="hover:text-blue-600 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
