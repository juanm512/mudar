import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@mudar/api", "@mudar/auth", "@mudar/db", "@mudar/geo"],
  // CORS manejado dinámicamente en proxy.ts (refleja el origin para chrome-extension:// y localhost)
}

export default nextConfig
