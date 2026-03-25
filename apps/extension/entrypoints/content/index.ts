// Content script de Mudar — panel lateral + overlay SVG + filtrado de markers
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
        z, x, y,
        tileWorldX: x * 256, tileWorldY: y * 256,
        tileOffsetX: tileRect.left - containerRect.left,
        tileOffsetY: tileRect.top - containerRect.top,
        containerRect,
        scale: 256 * Math.pow(2, z),
      }
    }

    function containerPxToLatLng(pxX: number, pxY: number, ref: TileRef) {
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
      const center = containerPxToLatLng(ref.containerRect.width / 2, ref.containerRect.height / 2, ref)
      return { lat: center.lat, lng: center.lng, zoom: ref.z }
    }

    function pointInRing(lng: number, lat: number, ring: number[][]) {
      let inside = false
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!
        const [xj, yj] = ring[j]!
        if (yi! > lat !== yj! > lat && lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!)
          inside = !inside
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
      let count = 0
      markers.forEach((m) => {
        const rect = m.getBoundingClientRect()
        const ax = rect.left + rect.width / 2 - ref.containerRect.left
        const ay = rect.top + rect.height - ref.containerRect.top
        const { lat, lng } = containerPxToLatLng(ax, ay, ref)
        const inside = pointInPolygon(lng, lat, polyRings)
        m.style.display = inside ? "" : "none"
        if (inside) count++
      })
      return count
    }

    function waitForArgenMap(cb: (container: HTMLElement, mapPane: HTMLElement) => void, retries = 40) {
      const container = document.querySelector(".leaflet-container") as HTMLElement | null
      const mapPane = container?.querySelector(".leaflet-map-pane") as HTMLElement | null
      const tile = container?.querySelector(".leaflet-tile") as HTMLImageElement | null
      if (mapPane && tile?.src) { cb(container!, mapPane); return }
      if (retries <= 0) { console.warn("[Mudar] mapa no encontrado"); return }
      setTimeout(() => waitForArgenMap(cb, retries - 1), 500)
    }

    // ── Reverse geocoding ─────────────────────────────────────────────────

    async function reverseGeocode(lat: number, lng: number): Promise<string> {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        const res = await fetch(url, { headers: { "User-Agent": "Mudar-Extension/1.0" } })
        const data = await res.json() as { display_name?: string }
        return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      }
    }

    // ── Estado del overlay ─────────────────────────────────────────────────

    let currentGeojson: GeoJSON | null = null
    let currentPolyRings: number[][][] = []
    let panelInstance: { setResultCount?: (n: number) => void } | null = null

    // ── Modo pick de mapa ─────────────────────────────────────────────────

    let mapPickCallback: ((lat: number, lng: number, label: string) => void) | null = null

    function activateMapPick(
      container: HTMLElement,
      cb: (lat: number, lng: number, label: string) => void
    ) {
      mapPickCallback = cb
      container.style.cursor = "crosshair"
    }

    // ── Inicialización ─────────────────────────────────────────────────────

    waitForArgenMap((argenContainer, mapPane) => {
      console.log("[Mudar] mapa detectado ✅")

      // Click en mapa para pick de origen
      argenContainer.addEventListener("click", async (e) => {
        const cb = mapPickCallback
        if (!cb) return
        // Limpiar inmediatamente para evitar doble-disparo durante el await
        mapPickCallback = null
        argenContainer.style.cursor = ""
        const ref = getTileRef(argenContainer)
        if (!ref) return
        const rect = argenContainer.getBoundingClientRect()
        const pxX = e.clientX - rect.left
        const pxY = e.clientY - rect.top
        const { lat, lng } = containerPxToLatLng(pxX, pxY, ref)
        const label = await reverseGeocode(lat, lng)
        cb(lat, lng, label)
      })

      // Montar panel
      const ui = createIntegratedUi(ctx, {
        position: "inline",
        onMount(container) {
          panelInstance = mount(Panel, {
            target: container,
            props: {
              getMapCenter: () => getMapState(argenContainer),
              onActivateMapPick: (cb) => activateMapPick(argenContainer, cb),
              onCalculate(geojson: GeoJSON, polyRings: number[][][]) {
                currentGeojson = geojson
                currentPolyRings = polyRings
                const ref = getTileRef(argenContainer)
                if (ref) drawGeoJSON(argenContainer, geojson, ref)
                const count = filterMarkers(argenContainer, polyRings)
                panelInstance?.setResultCount?.(count)
                const center = getMapState(argenContainer)
                if (center) saveToCache({ lat: center.lat, lng: center.lng, time: 0, transport: "unknown" }, geojson)
              },
              onClear() {
                currentGeojson = null
                currentPolyRings = []
                clearOverlay(argenContainer)
                argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                  .forEach((m) => (m.style.display = ""))
              },
            },
          }) as typeof panelInstance
          return panelInstance
        },
      })
      ui.mount()

      const cached = getLastCache()
      if (cached) console.log("[Mudar] caché disponible")

      // MutationObservers para sincronizar overlay en pan/zoom
      const syncCallback = () => {
        if (!currentGeojson || currentPolyRings.length === 0) return
        const ref = getTileRef(argenContainer)
        if (ref) {
          updateOverlay(argenContainer, currentGeojson, ref)
          const count = filterMarkers(argenContainer, currentPolyRings)
          panelInstance?.setResultCount?.(count)
        }
      }

      const panObserver = new MutationObserver(syncCallback)
      panObserver.observe(mapPane, { attributes: true, attributeFilter: ["style"] })

      const tilePane = argenContainer.querySelector(".leaflet-tile-pane")
      const markerPane = argenContainer.querySelector(".leaflet-marker-pane")
      const domObserver = new MutationObserver(syncCallback)
      if (tilePane) domObserver.observe(tilePane, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] })
      if (markerPane) domObserver.observe(markerPane, { childList: true, subtree: true })

      console.log("[Mudar] observers conectados ✅")

      // @ts-expect-error — debug
      window.__mudar = {
        getMapState: () => getMapState(argenContainer),
        getTileRef: () => getTileRef(argenContainer),
        filterMarkers: (rings: number[][][]) => filterMarkers(argenContainer, rings),
        pointInPolygon,
      }
    })
  },
})
