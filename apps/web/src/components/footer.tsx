import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Mudarg. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-800 transition-colors">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-gray-800 transition-colors">
              Términos
            </Link>
            <a
              href="mailto:ayuda@mudarg.com"
              className="hover:text-gray-800 transition-colors"
            >
              ayuda@mudarg.com
            </a>
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-gray-50 border border-gray-100 px-5 py-4 text-center">
          <p className="text-sm text-gray-600">
            ¿Tenés dudas, problemas o sugerencias?{" "}
            <a
              href="mailto:ayuda@mudarg.com"
              className="font-medium text-primary hover:underline"
            >
              Escribinos a ayuda@mudarg.com
            </a>{" "}
            — respondemos a la brevedad.
          </p>
        </div>
      </div>
    </footer>
  )
}
