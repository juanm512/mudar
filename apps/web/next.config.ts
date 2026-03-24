import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@mudar/api", "@mudar/auth", "@mudar/db", "@mudar/geo"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          // En desarrollo permitimos cualquier origin (incluye chrome-extension://)
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          // Nota: credentials no funciona con wildcard origin en navegador,
          // pero better-auth gestiona la sesión via cookie httpOnly en el mismo dominio.
          // Para extensión usamos cookies con SameSite=None en producción.
        ],
      },
    ]
  },
}

export default nextConfig
