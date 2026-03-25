import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de privacidad — Mudarg",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Política de privacidad
        </h1>
        <p className="mb-10 text-sm text-gray-500">
          Última actualización: marzo de 2026
        </p>

        <div className="space-y-8 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              1. Datos que recolectamos
            </h2>
            <p>Recolectamos únicamente los datos necesarios para operar el Servicio:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>
                <strong>Cuenta:</strong> nombre, dirección de email, contraseña
                encriptada (o datos de Google si usás OAuth).
              </li>
              <li>
                <strong>Uso:</strong> coordenadas geográficas y parámetros de
                los cálculos de isócrona que realizás.
              </li>
              <li>
                <strong>Sesión:</strong> IP de acceso, user agent del navegador,
                fecha y hora de conexión.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              2. Cómo usamos tus datos
            </h2>
            <p>Usamos tus datos exclusivamente para:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>Autenticarte y mantener tu sesión activa.</li>
              <li>Procesar tus cálculos de isócrona y guardar tu historial.</li>
              <li>Gestionar la compra y el consumo de tokens.</li>
              <li>Enviarte emails transaccionales (verificación, reset de contraseña).</li>
            </ul>
            <p className="mt-2">
              No vendemos ni compartimos tus datos con terceros con fines
              publicitarios.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              3. Almacenamiento y seguridad
            </h2>
            <p>
              Tus datos se almacenan en servidores seguros. Las contraseñas se
              guardan como hash irreversible (bcrypt). Usamos HTTPS para todas
              las comunicaciones. El acceso a la base de datos está restringido
              a la infraestructura de producción.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              4. Cookies y sesiones
            </h2>
            <p>
              Usamos una única cookie de sesión segura (HttpOnly, SameSite)
              para mantenerte autenticado. No usamos cookies de seguimiento ni
              analytics de terceros.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              5. Servicios de terceros
            </h2>
            <p>
              Utilizamos los siguientes servicios externos para operar:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>
                <strong>TravelTime API:</strong> para calcular isócronas
                (recibe coordenadas y parámetros de tiempo).
              </li>
              <li>
                <strong>Resend:</strong> para el envío de emails
                transaccionales.
              </li>
              <li>
                <strong>Rebill:</strong> para el procesamiento de pagos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              6. Tus derechos
            </h2>
            <p>
              Podés solicitar en cualquier momento el acceso, la rectificación
              o la eliminación de tus datos personales escribiéndonos a{" "}
              <a
                href="mailto:hola@mudarg.com"
                className="text-primary hover:underline"
              >
                hola@mudarg.com
              </a>
              . Procesamos las solicitudes dentro de los 30 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              7. Retención de datos
            </h2>
            <p>
              Conservamos tus datos mientras tu cuenta esté activa. Si eliminás
              tu cuenta, borramos tus datos personales dentro de los 30 días,
              excepto los que debamos retener por obligaciones legales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              8. Contacto
            </h2>
            <p>
              Consultas sobre privacidad:{" "}
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
