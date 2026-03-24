// Tipos para el sistema de geolocalización de Mudar

export interface GeoPoint {
  lat: number
  lng: number
}

export interface IsochroneParams {
  lat: number
  lng: number
  /** Tiempo de viaje en segundos */
  timeSeconds: number
  /** Modo de transporte */
  transport: "driving" | "public_transport" | "walking" | "cycling"
}

export interface IsochroneResult {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    properties: Record<string, unknown>
    geometry: {
      type: "Polygon" | "MultiPolygon"
      coordinates: number[][][] | number[][][][]
    }
  }>
}

export interface GeocodeResult {
  lat: number
  lng: number
  displayName?: string
}

/**
 * Interfaz genérica para proveedores de servicios geo.
 * Permite intercambiar TravelTime por otro proveedor sin cambiar el resto del código.
 */
export interface IGeoProvider {
  /** Calcula isócrona desde un punto */
  isochrone(params: IsochroneParams): Promise<IsochroneResult>

  /** Convierte dirección a coordenadas */
  geocode(address: string): Promise<GeocodeResult>

  /** Convierte coordenadas a dirección */
  reverseGeocode(lat: number, lng: number): Promise<string>
}

/**
 * Error tipado: la zona solicitada no tiene cobertura en TravelTime.
 * Cuando se lanza este error, el servidor NO debe descontar tokens al usuario.
 */
export class NoCoverageError extends Error {
  readonly code = "NO_COVERAGE" as const

  constructor(
    public readonly lat: number,
    public readonly lng: number,
    message?: string
  ) {
    super(message ?? `Sin cobertura para la zona (${lat}, ${lng})`)
    this.name = "NoCoverageError"
  }
}
