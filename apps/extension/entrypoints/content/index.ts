// Content script de Mudar — panel lateral + overlay Leaflet + filtrado de markers
import { mount } from "svelte"
import L from "leaflet"
import Panel from "./Panel.svelte"
import type { GeoJSON, TileRef } from "./overlay"
import { getLastCache } from "./cache"

const TRANSPORT_COLORS: Record<string, string> = {
  walking:          "#16a34a",
  cycling:          "#f59e0b",
  driving:          "#dc2626",
  public_transport: "#7c3aed",
}

export default defineContentScript({
  matches: [
    "*://www.argenprop.com/*",
    "*://argenprop.com/*",
    "*://www.zonaprop.com.ar/*",
    "*://zonaprop.com.ar/*",
  ],
  runAt: "document_idle",
  cssInjectionMode: "ui",

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

    function pointInPolygon(lng: number, lat: number, outerRings: number[][][]) {
      return outerRings.some(ring => pointInRing(lng, lat, ring))
    }

    function filterMarkersWithRings(container: HTMLElement, ringGroups: number[][][][]): number {
      const ref = getTileRef(container)
      if (!ref) return 0
      if (ringGroups.length === 0) return 0
      const markers = container.querySelectorAll(".leaflet-marker-icon") as NodeListOf<HTMLElement>
      let count = 0
      markers.forEach((m) => {
        const rect = m.getBoundingClientRect()
        const ax = rect.left + rect.width / 2 - ref.containerRect.left
        const ay = rect.top + rect.height - ref.containerRect.top
        const { lat, lng } = containerPxToLatLng(ax, ay, ref)
        const inside = ringGroups.some(r => pointInPolygon(lng, lat, r))
        m.style.display = inside ? "" : "none"
        if (inside) count++
      })
      return count
    }

    function filterMarkersAll(container: HTMLElement): number {
      return filterMarkersWithRings(container, [...allPolyRings.values()])
    }

    function waitForArgenMap(cb: (container: HTMLElement, mapPane: HTMLElement) => void | Promise<void>, retries = 40) {
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

    // Capas por transporte
    const geoLayers = new Map<string, ReturnType<typeof L.geoJSON>>()
    const allPolyRings = new Map<string, number[][][]>()
    const hiddenLayersSet = new Set<string>()

    let panelInstance: { setResultCount?: (n: number) => void } | null = null
    let markersVisible = true

    // Leaflet overlay map (nuestro propio mapa Leaflet, sincronizado con ArgenProp)
    let ourMap: ReturnType<typeof L.map> | null = null
    let originMarker: ReturnType<typeof L.circleMarker> | null = null

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

    // Inyectar CSS mínimo de Leaflet para los panes del overlay (scoped a #mudar-overlay)
    if (!document.getElementById("mudar-leaflet-css")) {
      const style = document.createElement("style")
      style.id = "mudar-leaflet-css"
      style.textContent = `
        #mudar-overlay { overflow: hidden; }
        #mudar-overlay .leaflet-pane,
        #mudar-overlay .leaflet-top,
        #mudar-overlay .leaflet-bottom { position: absolute; z-index: 400; pointer-events: none; }
        #mudar-overlay .leaflet-pane { left: 0; top: 0; }
        #mudar-overlay .leaflet-tile-pane { z-index: 200; }
        #mudar-overlay .leaflet-overlay-pane { z-index: 400; }
        #mudar-overlay .leaflet-overlay-pane svg { -moz-user-select: none; }
        #mudar-overlay .leaflet-zoom-animated { -webkit-transform-origin: 0 0; transform-origin: 0 0; }
        #mudar-overlay .leaflet-zoom-anim .leaflet-zoom-animated { will-change: transform; }
        #mudar-overlay .leaflet-zoom-anim .leaflet-zoom-animated { -webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1); -moz-transition: -moz-transform 0.25s cubic-bezier(0,0,0.25,1); transition: transform 0.25s cubic-bezier(0,0,0.25,1); }
        #mudar-overlay path.leaflet-interactive { cursor: pointer; }
        #mudar-overlay .leaflet-container { background: transparent; }
      `
      document.head.appendChild(style)
    }

    waitForArgenMap(async (argenContainer, mapPane) => {
      console.log("[Mudar] mapa detectado ✅")

      // ── Crear overlay Leaflet ──────────────────────────────────────────
      const overlayDiv = document.createElement("div")
      overlayDiv.id = "mudar-overlay"
      Object.assign(overlayDiv.style, {
        position: "absolute",
        top: "0", left: "0",
        width: "100%", height: "100%",
        pointerEvents: "none",
        // zIndex: "500",
      })
      argenContainer.appendChild(overlayDiv)

      const initial = getMapState(argenContainer) ?? { lat: -34.6, lng: -58.38, zoom: 13 }
      ourMap = L.map(overlayDiv, {
        center: [initial.lat, initial.lng],
        zoom: initial.zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      })
      // Tile layer transparente — Leaflet necesita uno para inicializar la proyección
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { opacity: 0 }).addTo(ourMap)

      console.log("[Mudar] overlay Leaflet creado ✅")

      // ── Click en mapa para pick de origen ────────────────────────────
      argenContainer.addEventListener("click", async (e) => {
        const cb = mapPickCallback
        if (!cb) return
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

      // ── Montar panel ──────────────────────────────────────────────────
      const ui = await createShadowRootUi(ctx, {
        name: "mudar-panel",
        position: "inline",
        anchor: "body",
        append: "last",
        onMount(container) {
          panelInstance = mount(Panel, {
            target: container,
            props: {
              getMapCenter: () => getMapState(argenContainer),
              onActivateMapPick: (cb) => activateMapPick(argenContainer, cb),
              onCalculate(geojson: GeoJSON, polyRings: number[][][], _originLat: number, _originLng: number, transport: string) {
                const color = TRANSPORT_COLORS[transport] ?? "#1a56db"
                // Eliminar capa anterior del mismo transporte
                if (geoLayers.has(transport)) {
                  geoLayers.get(transport)!.remove()
                }
                if (ourMap) {
                  const layer = L.geoJSON(geojson as Parameters<typeof L.geoJSON>[0], {
                    interactive: false,
                    style: {
                      color,
                      fillColor: color,
                      fillOpacity: 0.18,
                      weight: 2.5,
                      dashArray: "8 5",
                    },
                  }).addTo(ourMap)
                  geoLayers.set(transport, layer)
                  originMarker?.bringToFront()
                }
                allPolyRings.set(transport, polyRings)
                if (markersVisible) {
                  // Mostrar todos primero para que getBoundingClientRect() funcione
                  argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                    .forEach((m) => (m.style.display = ""))
                  const count = filterMarkersAll(argenContainer)
                  panelInstance?.setResultCount?.(count)
                }
              },
              onClear() {
                geoLayers.forEach(l => l.remove())
                geoLayers.clear()
                allPolyRings.clear()
                hiddenLayersSet.clear()
                if (originMarker) { originMarker.remove(); originMarker = null }
                argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                  .forEach((m) => (m.style.display = ""))
              },
              onSetOrigin(lat: number | null, lng: number | null) {
                if (originMarker) { originMarker.remove(); originMarker = null }
                if (lat !== null && lng !== null && ourMap) {
                  originMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    color: "#ffffff",
                    weight: 3,
                    fillColor: "#1a56db",
                    fillOpacity: 1,
                    interactive: false,
                  }).addTo(ourMap)
                }
              },
              onToggleLayer(transport: string, visible: boolean) {
                if (visible) {
                  hiddenLayersSet.delete(transport)
                  if (ourMap && geoLayers.has(transport))
                    geoLayers.get(transport)!.addTo(ourMap)
                } else {
                  hiddenLayersSet.add(transport)
                  geoLayers.get(transport)?.remove()
                }
                const visibleRings = [...allPolyRings.entries()]
                  .filter(([t]) => !hiddenLayersSet.has(t))
                  .map(([, r]) => r)
                argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                  .forEach(m => (m.style.display = ""))
                if (markersVisible && visibleRings.length > 0) {
                  const count = filterMarkersWithRings(argenContainer, visibleRings)
                  panelInstance?.setResultCount?.(count)
                } else if (visibleRings.length === 0) {
                  argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                    .forEach(m => (m.style.display = ""))
                }
              },
              onToggleMarkers(visible: boolean) {
                markersVisible = visible
                // Siempre mostrar primero para que getBoundingClientRect() funcione
                argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                  .forEach((m) => (m.style.display = ""))
                if (!visible) {
                  argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
                    .forEach((m) => (m.style.display = "none"))
                } else if (allPolyRings.size > 0) {
                  const count = filterMarkersAll(argenContainer)
                  panelInstance?.setResultCount?.(count)
                }
              },
            },
          }) as typeof panelInstance
          return panelInstance
        },
      })
      ui.mount()

      const cached = getLastCache()
      if (cached) console.log("[Mudar] caché disponible")

      // ── MutationObservers para sincronizar overlay en pan/zoom ────────
      const syncCallback = () => {
        const state = getMapState(argenContainer)
        if (!state) return
        if (ourMap) {
          ourMap.setView([state.lat, state.lng], state.zoom, { animate: false, duration: 0 })
        }
        if (allPolyRings.size > 0) {
          // Mostrar todos primero para que getBoundingClientRect() sea correcto
          argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
            .forEach((m) => (m.style.display = ""))
          if (markersVisible) {
            const count = filterMarkersAll(argenContainer)
            panelInstance?.setResultCount?.(count)
          } else {
            argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
              .forEach((m) => (m.style.display = "none"))
          }
        } else if (!markersVisible) {
          argenContainer.querySelectorAll<HTMLElement>(".leaflet-marker-icon")
            .forEach((m) => (m.style.display = "none"))
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
        filterMarkersAll: () => filterMarkersAll(argenContainer),
        pointInPolygon,
        ourMap: () => ourMap,
      }
    })
  },
})
