// Caché en localStorage para cálculos de isócrona

import type { GeoJSON } from "./overlay"

const CACHE_KEY = "mudar_cache"
const MAX_ENTRIES = 10

export interface CacheLayer {
  transport: string
  geojson: GeoJSON
}

export interface CacheEntry {
  params: {
    lat: number
    lng: number
    time: number      // segundos
    address?: string
  }
  layers: CacheLayer[]
  timestamp: string
}

function readCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const entries = JSON.parse(raw) as CacheEntry[]
    // Migración: formato viejo tenía params.transport
    if (entries.length > 0 && "transport" in (entries[0]?.params ?? {})) {
      clearCache()
      return []
    }
    return entries
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

export function saveToCache(
  params: { lat: number; lng: number; time: number; address?: string },
  layers: CacheLayer[]
): void {
  const entries = readCache()
  entries.push({ params, layers, timestamp: new Date().toISOString() })
  const trimmed = entries.slice(-MAX_ENTRIES)
  writeCache(trimmed)
}

export function getHistory(): CacheEntry[] {
  return readCache()
}

export function getLastCache(): CacheEntry | null {
  const entries = readCache()
  return entries[entries.length - 1] ?? null
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
