import type { Metadata } from "next"

import { Header } from "@/components/header"
import "./styles.css"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mudarg.com"
const description =
  "Encontrá tu próximo hogar en Argentina usando isócronas. Buscá propiedades según cuánto tardás en llegar a donde importa."

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
        <Header />
        {children}
      </body>
    </html>
  )
}
