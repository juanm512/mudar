// Adaptador para Nominatim (OpenStreetMap) — geocoding gratuito
// https://nominatim.org/release-docs/develop/api/Search/

import type { GeocodeResult } from "./types"

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

export class NominatimProvider {
  private readonly userAgent: string

  constructor(userAgent = "Mudar/1.0") {
    this.userAgent = userAgent
  }

  async geocode(address: string): Promise<GeocodeResult> {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      countrycodes: "ar", // Restringir a Argentina
    })

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        "User-Agent": this.userAgent,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`
      )
    }

    const data = (await response.json()) as Array<{
      lat: string
      lon: string
      display_name: string
    }>

    if (data.length === 0) {
      throw new Error(`No se encontró la dirección: ${address}`)
    }

    const result = data[0]!
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
    })

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        "User-Agent": this.userAgent,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Nominatim reverse geocode error: ${response.status} ${response.statusText}`
      )
    }

    const data = (await response.json()) as { display_name: string }
    return data.display_name
  }
}
