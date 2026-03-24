import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // React Compiler estable en Next.js 16
  reactCompiler: true,

  // Turbopack estable por defecto en Next.js 16
  // No hace falta flag extra, se activa con --turbopack en dev

  // Transpile workspace packages
  transpilePackages: ["@mudar/api", "@mudar/auth", "@mudar/db", "@mudar/geo"],
}

export default nextConfig
