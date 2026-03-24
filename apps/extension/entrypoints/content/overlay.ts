// Overlay SVG para dibujar polígonos GeoJSON sobre el mapa de Leaflet

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

// ── TileRef (mismo tipo que en index.ts) ─────────────────────────────────────

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

const SVG_ID = "mudar-overlay"

/**
 * Convierte lat/lng a coordenadas de píxel relativas al container del mapa.
 * Inversa de containerPxToLatLng.
 */
function latLngToContainerPx(
  lat: number,
  lng: number,
  ref: TileRef
): { x: number; y: number } {
  const worldX = ((lng + 180) / 360) * ref.scale
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const worldY =
    ((1 - Math.log((1 + sinLat) / (1 - sinLat)) / (2 * Math.PI)) / 2) *
    ref.scale

  const x = worldX - ref.tileWorldX + ref.tileOffsetX
  const y = worldY - ref.tileWorldY + ref.tileOffsetY
  return { x, y }
}

/**
 * Convierte un anillo de coordenadas GeoJSON [lng, lat] a un SVG path string.
 */
function ringToPath(ring: number[][], ref: TileRef): string {
  if (ring.length === 0) return ""
  const points = ring.map(([lng, lat]) => {
    const { x, y } = latLngToContainerPx(lat!, lng!, ref)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M ${points.join(" L ")} Z`
}

/**
 * Extrae todos los anillos poligonales de un GeoJSON como arrays de coordinates.
 * Retorna array de anillos, cada anillo es [lng, lat][].
 */
function extractPolygonRings(geojson: GeoJSON): number[][][] {
  const rings: number[][][] = []

  function addPolygon(coords: number[][][]) {
    if (coords[0]) rings.push(coords[0]) // exterior ring
  }

  if (geojson.type === "FeatureCollection") {
    for (const feature of geojson.features) {
      if (feature.geometry.type === "Polygon") {
        addPolygon(feature.geometry.coordinates)
      } else if (feature.geometry.type === "MultiPolygon") {
        for (const poly of feature.geometry.coordinates) {
          addPolygon(poly)
        }
      }
    }
  } else if (geojson.type === "Feature") {
    if (geojson.geometry.type === "Polygon") {
      addPolygon(geojson.geometry.coordinates)
    } else if (geojson.geometry.type === "MultiPolygon") {
      for (const poly of geojson.geometry.coordinates) {
        addPolygon(poly)
      }
    }
  } else if (geojson.type === "Polygon") {
    addPolygon(geojson.coordinates)
  } else if (geojson.type === "MultiPolygon") {
    for (const poly of geojson.coordinates) {
      addPolygon(poly)
    }
  }

  return rings
}

/**
 * Dibuja el GeoJSON como SVG overlay sobre el container del mapa.
 */
export function drawGeoJSON(
  container: HTMLElement,
  geojson: GeoJSON,
  ref: TileRef
): void {
  clearOverlay(container)

  const rings = extractPolygonRings(geojson)
  if (rings.length === 0) return

  const rect = container.getBoundingClientRect()
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.id = SVG_ID
  svg.setAttribute("width", String(rect.width))
  svg.setAttribute("height", String(rect.height))
  svg.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 500;
    overflow: visible;
  `

  for (const ring of rings) {
    const pathData = ringToPath(ring, ref)
    if (!pathData) continue

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", pathData)
    path.setAttribute("fill", "rgba(26, 86, 219, 0.15)")
    path.setAttribute("stroke", "#1a56db")
    path.setAttribute("stroke-width", "2.5")
    path.setAttribute("stroke-dasharray", "8 5")
    path.setAttribute("stroke-linejoin", "round")
    svg.appendChild(path)
  }

  container.style.position = "relative"
  container.appendChild(svg)
}

/**
 * Actualiza el overlay si ya existe (redibujar en pan/zoom).
 */
export function updateOverlay(
  container: HTMLElement,
  geojson: GeoJSON,
  ref: TileRef
): void {
  drawGeoJSON(container, geojson, ref)
}

/**
 * Elimina el overlay SVG del container.
 */
export function clearOverlay(container: HTMLElement): void {
  const existing = container.querySelector(`#${SVG_ID}`)
  existing?.remove()
}
