// Adaptador para TravelTime API — isócronas
// https://docs.traveltime.com/api/overview/introduction

import type { IGeoProvider, IsochroneParams, IsochroneResult, GeocodeResult } from "./types"
import { NoCoverageError } from "./types"
import { env } from "./env"

const TRAVELTIME_BASE = "https://api.traveltimeapp.com/v4"

// Mapeo de nuestros transportes al formato TravelTime
const TRANSPORT_MAP: Record<string, string> = {
  driving: "driving",
  public_transport: "public_transport",
  walking: "walking",
  cycling: "cycling",
}

export class TravelTimeProvider implements IGeoProvider {
  private readonly appId: string
  private readonly apiKey: string

  constructor(appId?: string, apiKey?: string) {
    this.appId = appId ?? env.TRAVELTIME_APP_ID
    this.apiKey = apiKey ?? env.TRAVELTIME_API_KEY
  }

  async isochrone(params: IsochroneParams): Promise<IsochroneResult> {
    const transportType = TRANSPORT_MAP[params.transport] ?? "driving"

    const body = {
      departure_searches: [
        {
          id: "mudar-isochrone",
          coords: { lat: params.lat, lng: params.lng },
          departure_time: new Date().toISOString(),
          travel_time: params.timeSeconds,
          transportation: { type: transportType },
        },
      ],
    }

    const response = await fetch(`${TRAVELTIME_BASE}/time-map`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Application-Id": this.appId,
        "X-Api-Key": this.apiKey,
      },
      body: JSON.stringify(body),
    })

    // Error 422: zona sin cobertura → no descontar tokens
    if (response.status === 422) {
      throw new NoCoverageError(params.lat, params.lng)
    }

    if (!response.ok) {
      throw new Error(
        `TravelTime API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json() as {
      results: Array<{
        shapes: Array<{
          shell: Array<{ lat: number; lng: number }>
          holes: Array<Array<{ lat: number; lng: number }>>
        }>
      }>
    }

    // Convertir respuesta de TravelTime a GeoJSON estándar
    const shapes = data.results?.[0]?.shapes ?? []
    const features = shapes.map((shape) => {
      const shell = shape.shell.map((p) => [p.lng, p.lat] as [number, number])
      // Cerrar el anillo si no está cerrado
      if (shell.length > 0 && (shell[0]![0] !== shell[shell.length - 1]![0] || shell[0]![1] !== shell[shell.length - 1]![1])) {
        shell.push(shell[0]!)
      }

      const rings: Array<Array<[number, number]>> = [shell]
      for (const hole of shape.holes) {
        const holeRing = hole.map((p) => [p.lng, p.lat] as [number, number])
        if (holeRing.length > 0 && (holeRing[0]![0] !== holeRing[holeRing.length - 1]![0] || holeRing[0]![1] !== holeRing[holeRing.length - 1]![1])) {
          holeRing.push(holeRing[0]!)
        }
        rings.push(holeRing)
      }

      return {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Polygon" as const,
          coordinates: rings,
        },
      }
    })

    return {
      type: "FeatureCollection",
      features,
    }
  }

  async geocode(_address: string): Promise<GeocodeResult> {
    // TravelTime no tiene geocoding — se usa Nominatim
    throw new Error("TravelTime no soporta geocoding. Usar NominatimProvider.")
  }

  async reverseGeocode(_lat: number, _lng: number): Promise<string> {
    throw new Error(
      "TravelTime no soporta reverse geocoding. Usar NominatimProvider."
    )
  }
}
