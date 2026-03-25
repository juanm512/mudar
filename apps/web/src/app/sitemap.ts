import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://mudarg.com"
  const now = new Date()

  return [
    { url: base, lastModified: now, priority: 1 },
    { url: `${base}/sign-up`, lastModified: now, priority: 0.8 },
    { url: `${base}/sign-in`, lastModified: now, priority: 0.7 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
  ]
}
