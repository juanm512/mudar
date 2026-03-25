import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos y condiciones — Mudarg",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Términos y condiciones
        </h1>
        <p className="mb-10 text-sm text-gray-500">
          Última actualización: marzo de 2026
        </p>

        <div className="space-y-8 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              1. Aceptación de los términos
            </h2>
            <p>
              Al acceder y usar Mudarg (el "Servicio"), aceptás quedar obligado
              por estos Términos y Condiciones. Si no estás de acuerdo con
              alguna parte de estos términos, no podés usar el Servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              2. Descripción del servicio
            </h2>
            <p>
              Mudarg es una extensión de navegador y plataforma web que permite
              visualizar isócronas de tiempo de viaje sobre portales
              inmobiliarios. El Servicio requiere una cuenta de usuario y puede
              involucrar el consumo de tokens para realizar cálculos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              3. Cuenta de usuario
            </h2>
            <p>
              Sos responsable de mantener la confidencialidad de tus
              credenciales y de toda actividad que ocurra bajo tu cuenta.
              Debés notificarnos de inmediato ante cualquier uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              4. Tokens y pagos
            </h2>
            <p>
              Algunos cálculos consumen tokens. Los tokens se adquieren
              mediante packs de pago. Los tokens no son reembolsables ni
              transferibles. El precio de los packs puede modificarse con
              previo aviso. Los cálculos a pie son gratuitos y no consumen
              tokens.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              5. Uso aceptable
            </h2>
            <p>
              Acordás no usar el Servicio para fines ilegales, para abusar de
              la infraestructura técnica, ni para intentar eludir los controles
              de consumo de tokens. Nos reservamos el derecho de suspender
              cuentas que violen esta política.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              6. Disponibilidad y exactitud
            </h2>
            <p>
              Los tiempos de viaje son estimaciones proporcionadas por APIs de
              terceros y pueden no reflejar condiciones de tráfico en tiempo
              real. No garantizamos disponibilidad continua del Servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              7. Limitación de responsabilidad
            </h2>
            <p>
              En la máxima medida permitida por la ley, Mudarg no será
              responsable por daños indirectos, incidentales o consecuentes
              derivados del uso o la imposibilidad de usar el Servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              8. Modificaciones
            </h2>
            <p>
              Podemos modificar estos términos en cualquier momento. Los
              cambios significativos serán notificados por email. El uso
              continuado del Servicio tras las modificaciones implica
              aceptación.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              9. Contacto
            </h2>
            <p>
              Consultas sobre estos términos:{" "}
              <a
                href="mailto:hola@mudarg.com"
                className="text-primary hover:underline"
              >
                hola@mudarg.com
              </a>
            </p>
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          <Link href="/" className="text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  )
}
