import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@mudar/api", "@mudar/auth", "@mudar/db", "@mudar/geo"],
  // CORS manejado dinámicamente en proxy.ts (refleja el origin para chrome-extension:// y localhost)
  allowedDevOrigins: ['driven-department-picking-collaboration.trycloudflare.com'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default nextConfig
