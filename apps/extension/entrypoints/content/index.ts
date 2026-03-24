// Content script de Mudar — activo en ArgenProp y ZonaProp
// Panel lateral + overlay SVG + filtrado de markers

import { mount } from "svelte"
import Panel from "./Panel.svelte"
import { drawGeoJSON, clearOverlay, updateOverlay } from "./overlay"
import type { GeoJSON, TileRef } from "./overlay"
import { saveToCache, getLastCache } from "./cache"

export default defineContentScript({
  matches: [
    "*://www.argenprop.com/*",
    "*://argenprop.com/*",
    "*://www.zonaprop.com.ar/*",
    "*://zonaprop.com.ar/*",
  ],
  runAt: "document_idle",

  main(ctx) {
    console.log("[Mudar] content script cargado ✅")

    // ── Utilidades de mapa ──────────────────────────────────────────────────

    function getTileRef(container: HTMLElement): TileRef | null {
      const tile = container.querySelector(".leaflet-tile") as HTMLImageElement | null
      if (!tile?.src) return null

      const parts = tile.src.split("/")
      const z = parseInt(parts[parts.length - 3]!, 10)
      const x = parseInt(parts[parts.length - 2]!, 10)
      const y = parseInt(parts[parts.length - 1]!, 10)
      if (isNaN(z) || isNaN(x) || isNaN(y)) return null

      const tileRect = tile.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      return {
        z,
        x,
        y,
        tileWorldX: x * 256,
        tileWorldY: y * 256,
        tileOffsetX: tileRect.left - containerRect.left,
        tileOffsetY: tileRect.top - containerRect.top,
        containerRect,
        scale: 256 * Math.pow(2, z),
      }
    }

    function containerPxToLatLng(
      pxX: number,
      pxY: number,
      ref: TileRef
    ) {
      const worldX = ref.tileWorldX - ref.tileOffsetX + pxX
      const worldY = ref.tileWorldY - ref.tileOffsetY + pxY
      const lng = (worldX / ref.scale) * 360 - 180
      const n = Math.PI - (2 * Math.PI * worldY) / ref.scale
      const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
      return { lat, lng }
    }

    function getMapState(container: HTMLElement) {
      const ref = getTileRef(container)
      if (!ref) return null
      const center = containerPxToLatLng(
        ref.containerRect.width / 2,
        ref.containerRect.height / 2,
        ref
      )
      return { lat: center.lat, lng: center.lng, zoom: ref.z }
    }

    function pointInRing(lng: number, lat: number, ring: number[][]) {
      let inside = false
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!
        const [xj, yj] = ring[j]!
        if (
          yi! > lat !== yj! > lat &&
          lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!
        ) {
          inside = !inside
        }
      }
      return inside
    }

    function pointInPolygon(lng: number, lat: number, rings: number[][][]) {
      return pointInRing(lng, lat, rings[0]!)
    }

    function filterMarkers(container: HTMLElement, polyRings: number[][][]): number {
      const ref = getTileRef(container)
      if (!ref) return 0

      const markers = container.querySelectorAll(".leaflet-marker-icon") as NodeListOf<HTMLElement>
      let insideCount = 0

      markers.forEach((marker) => {
        const rect = marker.getBoundingClientRect()
        const anchorX = rect.left + rect.width / 2 - ref.containerRect.left
        const anchorY = rect.top + rect.height - ref.containerRect.top
        const { lat, lng } = containerPxToLatLng(anchorX, anchorY, ref)
        const inside = pointInPolygon(lng, lat, polyRings)
        marker.style.display = inside ? "" : "none"
        if (inside) insideCount++
      })

      return insideCount
    }

    function waitForArgenMap(
      cb: (container: HTMLElement, mapPane: HTMLElement) => void,
      retries = 40
    ) {
      const container = document.querySelector(".leaflet-container") as HTMLElement | null
      const mapPane = container?.querySelector(".leaflet-map-pane") as HTMLElement | null
      const tile = container?.querySelector(".leaflet-tile") as HTMLImageElement | null

      if (mapPane && tile?.src) {
        cb(container!, mapPane)
        return
      }
      if (retries <= 0) {
        console.warn("[Mudar] mapa de ArgenProp no apareció")
        return
      }
      setTimeout(() => waitForArgenMap(cb, retries - 1), 500)
    }

    // ── Estado del overlay ──────────────────────────────────────────────────

    let currentGeojson: GeoJSON | null = null
    let currentPolyRings: number[][][] = []
    let panelInstance: ReturnType<typeof mount> & { setResultCount?: (n: number) => void } | null = null

    // ── Inicialización ──────────────────────────────────────────────────────

    waitForArgenMap((argenContainer, mapPane) => {
      console.log("[Mudar] mapa de ArgenProp detectado ✅")

      const state = getMapState(argenContainer)
      if (state) {
        console.log(`[Mudar] centro: ${state.lat.toFixed(4)}, ${state.lng.toFixed(4)} zoom: ${state.zoom}`)
      }

      // Montar panel lateral con createIntegratedUi
      const ui = createIntegratedUi(ctx, {
        position: "inline",
        onMount(container) {
          panelInstance = mount(Panel, {
            target: container,
            props: {
              getMapCenter: () => getMapState(argenContainer),
              onCalculate(geojson: GeoJSON, polyRings: number[][][]) {
                currentGeojson = geojson
                currentPolyRings = polyRings
                const ref = getTileRef(argenContainer)
                if (ref) {
                  drawGeoJSON(argenContainer, geojson, ref)
                }
                // Filtrar markers y actualizar conteo
                const count = filterMarkers(argenContainer, polyRings)
                if (panelInstance?.setResultCount) {
                  panelInstance.setResultCount(count)
                }
                // Guardar en caché
                // Extraer lat/lng del centro
                const center = getMapState(argenContainer)
                if (center) {
                  saveToCache(
                    { lat: center.lat, lng: center.lng, time: 0, transport: "unknown" },
                    geojson
                  )
                }
              },
              onClear() {
                currentGeojson = null
                currentPolyRings = []
                clearOverlay(argenContainer)
                // Restaurar todos los markers
                argenContainer
                  .querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                  .forEach((m) => (m.style.display = ""))
              },
            },
          }) as typeof panelInstance
          return panelInstance
        },
      })
      ui.mount()

      // Ofrecer restaurar caché si existe
      const cached = getLastCache()
      if (cached) {
        console.log("[Mudar] caché encontrado — disponible para restaurar")
      }

      // MutationObserver para sincronización con el mapa
      const syncCallback = () => {
        if (!currentGeojson || currentPolyRings.length === 0) return
        const ref = getTileRef(argenContainer)
        if (ref) {
          updateOverlay(argenContainer, currentGeojson, ref)
          const count = filterMarkers(argenContainer, currentPolyRings)
          if (panelInstance?.setResultCount) {
            panelInstance.setResultCount(count)
          }
        }
      }

      const panObserver = new MutationObserver(syncCallback)
      panObserver.observe(mapPane, { attributes: true, attributeFilter: ["style"] })

      const tilePane = argenContainer.querySelector(".leaflet-tile-pane")
      const markerPane = argenContainer.querySelector(".leaflet-marker-pane")
      const domObserver = new MutationObserver(syncCallback)

      if (tilePane) {
        domObserver.observe(tilePane, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["src"],
        })
      }
      if (markerPane) {
        domObserver.observe(markerPane, { childList: true, subtree: true })
      }

      console.log("[Mudar] observers conectados ✅")

      // @ts-expect-error — solo para desarrollo
      window.__mudar = {
        getMapState: () => getMapState(argenContainer),
        getTileRef: () => getTileRef(argenContainer),
        filterMarkers: (rings: number[][][]) => filterMarkers(argenContainer, rings),
        pointInPolygon,
      }
    })
  },
})
