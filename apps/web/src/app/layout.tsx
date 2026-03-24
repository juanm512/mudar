import type { Metadata } from "next"

import { Header } from "@/components/header"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mudar — Buscá propiedades por tiempo de viaje",
  description:
    "Encontrá tu próximo hogar en Argentina usando isócronas. Buscá propiedades según cuánto tardás en llegar a donde importa.",
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
