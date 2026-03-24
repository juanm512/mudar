import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Transpile workspace packages
  transpilePackages: ["@mudar/api", "@mudar/auth", "@mudar/db", "@mudar/geo"],
}

export default nextConfig
