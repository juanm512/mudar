// Content script de Mudar — activo en ArgenProp y ZonaProp
// Lógica base extraída de relocate-extension (versión validada)
// ──────────────────────────────────────────────────────────────
// NOTA: por ahora solo scaffold con las utilidades validadas.
// La lógica de mapa espejo y overlay se implementará después.

export default defineContentScript({
  matches: [
    "*://www.argenprop.com/*",
    "*://argenprop.com/*",
    "*://www.zonaprop.com.ar/*",
    "*://zonaprop.com.ar/*",
  ],
  runAt: "document_idle",

  main() {
    console.log("[Mudar] content script cargado ✅")

    // ── Utilidades validadas de relocate-extension ────────────────────────

    /**
     * Lee posición del mapa desde los tiles de Leaflet (z/x/y).
     * El tile URL tiene formato: .../{z}/{x}/{y}.png
     * Fuente: relocate-extension/content.js L114-136
     */
    function getTileRef(container: HTMLElement) {
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

    /**
     * Convierte coordenadas de píxel del container a lat/lng.
     * Usa proyección Web Mercator.
     * Fuente: relocate-extension/content.js L139-146
     */
    function containerPxToLatLng(
      pxX: number,
      pxY: number,
      ref: NonNullable<ReturnType<typeof getTileRef>>
    ) {
      const worldX = ref.tileWorldX - ref.tileOffsetX + pxX
      const worldY = ref.tileWorldY - ref.tileOffsetY + pxY
      const lng = (worldX / ref.scale) * 360 - 180
      const n = Math.PI - (2 * Math.PI * worldY) / ref.scale
      const lat =
        (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
      return { lat, lng }
    }

    /**
     * Obtiene el estado actual del mapa (centro + zoom).
     * Fuente: relocate-extension/content.js L149-158
     */
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

    /**
     * Ray casting para point-in-polygon.
     * ring: array de [lng, lat] (formato GeoJSON)
     * Fuente: relocate-extension/content.js L94-105
     */
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
      // rings[0] = exterior, rings[1..] = hoyos
      return pointInRing(lng, lat, rings[0]!)
    }

    /**
     * Filtra markers de ArgenProp según polígono GeoJSON.
     * Oculta markers fuera de la zona y cuenta los que están dentro.
     * Fuente: relocate-extension/content.js L161-195
     */
    function filterMarkers(
      container: HTMLElement,
      polyRings: number[][][]
    ): number {
      const ref = getTileRef(container)
      if (!ref) return 0

      const markers = container.querySelectorAll(
        ".leaflet-marker-icon"
      ) as NodeListOf<HTMLElement>
      let insideCount = 0

      markers.forEach((marker) => {
        const rect = marker.getBoundingClientRect()
        // El anchor del marker está en el centro-abajo del ícono
        const anchorX = rect.left + rect.width / 2 - ref.containerRect.left
        const anchorY = rect.top + rect.height - ref.containerRect.top

        const { lat, lng } = containerPxToLatLng(anchorX, anchorY, ref)
        const inside = pointInPolygon(lng, lat, polyRings)

        marker.style.display = inside ? "" : "none"
        if (inside) insideCount++
      })

      return insideCount
    }

    /**
     * Espera a que ArgenProp renderice su mapa Leaflet.
     * Busca .leaflet-container, .leaflet-map-pane y un .leaflet-tile con src.
     * Fuente: relocate-extension/content.js L198-205
     */
    function waitForArgenMap(
      cb: (container: HTMLElement, mapPane: HTMLElement) => void,
      retries = 40
    ) {
      const container = document.querySelector(
        ".leaflet-container"
      ) as HTMLElement | null
      const mapPane = container?.querySelector(
        ".leaflet-map-pane"
      ) as HTMLElement | null
      const tile = container?.querySelector(
        ".leaflet-tile"
      ) as HTMLImageElement | null

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

    // ── Inicialización ──────────────────────────────────────────────────────

    waitForArgenMap((argenContainer, mapPane) => {
      console.log("[Mudar] mapa de ArgenProp detectado ✅")

      const state = getMapState(argenContainer)
      if (state) {
        console.log(
          `[Mudar] centro: ${state.lat.toFixed(4)}, ${state.lng.toFixed(4)} zoom: ${state.zoom}`
        )
      }

      /**
       * MutationObserver para sincronización con el mapa.
       * Observer 1: pan — observa cambios de style en .leaflet-map-pane
       * Observer 2: zoom — observa nuevos tiles y markers
       * Fuente: relocate-extension/content.js L292-315
       */
      const syncCallback = () => {
        // TODO: sincronizar overlay y filtrar markers cuando se implemente
        // la lógica de mapa espejo
      }

      // Observer de pan (movimiento del mapa)
      const panObserver = new MutationObserver(syncCallback)
      panObserver.observe(mapPane, {
        attributes: true,
        attributeFilter: ["style"],
      })

      // Observer de zoom (nuevos tiles) y markers nuevos
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
        domObserver.observe(markerPane, {
          childList: true,
          subtree: true,
        })
      }

      console.log("[Mudar] observers conectados ✅")

      // Exportar utilidades al scope global para debug
      // @ts-expect-error — solo para desarrollo
      window.__mudar = {
        getMapState: () => getMapState(argenContainer),
        getTileRef: () => getTileRef(argenContainer),
        filterMarkers: (rings: number[][][]) =>
          filterMarkers(argenContainer, rings),
        pointInPolygon,
      }
    })
  },
})
