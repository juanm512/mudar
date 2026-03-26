import type { Metadata } from "next"
import Script from "next/script"

import { Header } from "@/components/header"
import "./styles.css"

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mudarg.com"
const description =
  "Encontrá tu próximo hogar filtrando por zonas en los portales de busqueda de propiedades. Mudarg te muestra propiedades según cuánto tardás en llegar a donde importa."

export const metadata: Metadata = {
  title: "Mudarg — Buscá propiedades por tiempo de viaje",
  description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon0.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Mudarg — Buscá propiedades por tiempo de viaje",
    description,
    url: baseUrl,
    siteName: "Mudarg",
    locale: "es_AR",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <Header />
        {children}
        {GTM_ID && (
          <Script id="gtm-init" strategy="afterInteractive">{`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}</Script>
        )}
      </body>
    </html>
  )
}
