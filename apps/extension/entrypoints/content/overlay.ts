// Tipos GeoJSON y TileRef usados por index.ts

export interface GeoJSONGeometryPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export interface GeoJSONGeometryMultiPolygon {
  type: "MultiPolygon"
  coordinates: number[][][][]
}

export interface GeoJSONFeature {
  type: "Feature"
  geometry: GeoJSONGeometryPolygon | GeoJSONGeometryMultiPolygon
  properties: Record<string, unknown> | null
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection"
  features: GeoJSONFeature[]
}

export type GeoJSON =
  | GeoJSONFeature
  | GeoJSONFeatureCollection
  | GeoJSONGeometryPolygon
  | GeoJSONGeometryMultiPolygon

export interface TileRef {
  z: number
  x: number
  y: number
  tileWorldX: number
  tileWorldY: number
  tileOffsetX: number
  tileOffsetY: number
  containerRect: DOMRect
  scale: number
}
