// Caché en localStorage para cálculos de isócrona

import type { GeoJSON } from "./overlay"

const CACHE_KEY = "mudar_cache"
const MAX_ENTRIES = 10

export interface CacheParams {
  lat: number
  lng: number
  time: number
  transport: string
}

export interface CacheEntry {
  params: CacheParams
  geojson: GeoJSON
  timestamp: string
}

function readCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CacheEntry[]
  } catch {
    return []
  }
}

function writeCache(entries: CacheEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage lleno — ignorar
  }
}

export function saveToCache(params: CacheParams, geojson: GeoJSON): void {
  const entries = readCache()
  entries.push({ params, geojson, timestamp: new Date().toISOString() })
  // Mantener solo los últimos MAX_ENTRIES (FIFO)
  const trimmed = entries.slice(-MAX_ENTRIES)
  writeCache(trimmed)
}

export function getLastCache(): CacheEntry | null {
  const entries = readCache()
  return entries[entries.length - 1] ?? null
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
