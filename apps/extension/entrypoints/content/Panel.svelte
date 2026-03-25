<script lang="ts">
  import { tick } from "svelte"
  import {
    QueryClient,
    setQueryClientContext,
    createQuery,
  } from "@tanstack/svelte-query"
  import { orpc, api } from "@/api"
  import type { GeoJSON } from "./overlay"
  import { saveToCache, getHistory, type CacheEntry, type CacheLayer } from "./cache"

  // ── QueryClient ───────────────────────────────────────────────────────────
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  })
  setQueryClientContext(queryClient)

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props {
    getMapCenter: () => { lat: number; lng: number } | null
    onCalculate: (geojson: GeoJSON, polyRings: number[][][], lat: number, lng: number, transport: string) => void
    onClear: () => void
    onActivateMapPick: (cb: (lat: number, lng: number, label: string) => void) => void
    onToggleMarkers: (visible: boolean) => void
    onSetOrigin: (lat: number | null, lng: number | null) => void
  }
  const { getMapCenter, onCalculate, onClear, onActivateMapPick, onToggleMarkers, onSetOrigin }: Props = $props()

  // ── Constantes de transporte ───────────────────────────────────────────────
  const TRANSPORT_OPTIONS = [
    { value: "walking",          label: "🚶 Caminando",     free: true,  color: "#16a34a" },
    { value: "cycling",          label: "🚲 Bici",           free: false, color: "#f59e0b" },
    { value: "driving",          label: "🚗 Auto",           free: false, color: "#dc2626" },
    { value: "public_transport", label: "🚌 Trans. público", free: false, color: "#7c3aed" },
  ]
  const TRANSPORT_COLORS: Record<string, string> = {
    walking: "#16a34a", cycling: "#f59e0b", driving: "#dc2626", public_transport: "#7c3aed",
  }
  const TRANSPORT_LABELS: Record<string, string> = {
    walking: "🚶", cycling: "🚲", driving: "🚗", public_transport: "🚌",
  }

  // ── Estado UI ─────────────────────────────────────────────────────────────
  let minimized = $state(false)
  let panelX = $state<number | null>(null)
  let panelY = $state(80)
  let isDragging = $state(false)
  let dragOffsetX = 0
  let dragOffsetY = 0
  let activeTab = $state<"calculate" | "history">("calculate")

  // ── Estado del formulario ─────────────────────────────────────────────────
  let address = $state("")
  let suggestions = $state<NominatimResult[]>([])
  let showSuggestions = $state(false)
  let selectedLat = $state<number | null>(null)
  let selectedLng = $state<number | null>(null)
  let timeMinutes = $state(30)
  let selectedTransports = $state(new Set<string>(["walking"]))
  let resultCount = $state<number | null>(null)
  let markersVisible = $state(true)
  let calculationOrigin = $state<{ lat: number; lng: number } | null>(null)

  // ── Estado de cálculo ─────────────────────────────────────────────────────
  let isCalculating = $state(false)
  let isLoadingHistory = $state(false)
  let calculationError = $state<string | null>(null)
  let hasResults = $state(false)

  // ── Historial ─────────────────────────────────────────────────────────────
  let history = $state<CacheEntry[]>([])
  loadHistory()

  function loadHistory() {
    history = getHistory()
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) +
      " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  }

  function toggleMarkers() {
    markersVisible = !markersVisible
    onToggleMarkers(markersVisible)
  }

  let debounceTimer: ReturnType<typeof setTimeout>

  interface NominatimResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
  }

  // ── TanStack Query: tokens ────────────────────────────────────────────────
  const tokensQuery = createQuery(orpc.tokens.balance.queryOptions())

  const tokens = $derived(($tokensQuery.data as { tokens: number } | undefined)?.tokens ?? null)
  const loggedIn = $derived(
    $tokensQuery.data !== undefined ||
    ($tokensQuery.isError && ($tokensQuery.error as { code?: string })?.code !== "UNAUTHORIZED")
  )

  // ── Derived: costo y validación ───────────────────────────────────────────
  const tokenCost = $derived(
    [...selectedTransports].filter(t => t !== "walking").length
  )
  const canCalculate = $derived(
    loggedIn &&
    !isCalculating &&
    selectedLat !== null &&
    selectedLng !== null &&
    selectedTransports.size > 0 &&
    (tokenCost === 0 || (tokens !== null && tokens >= tokenCost))
  )

  // Notificar cambio de origen al overlay
  $effect(() => {
    onSetOrigin(selectedLat, selectedLng)
  })

  // ── Geocoding Nominatim ───────────────────────────────────────────────────
  function onAddressInput() {
    clearTimeout(debounceTimer)
    if (address.length < 3) { suggestions = []; showSuggestions = false; return }
    debounceTimer = setTimeout(searchAddress, 500)
  }

  async function searchAddress() {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=ar&limit=5`
      const res = await fetch(url, { headers: { "User-Agent": "Mudar-Extension/1.0" } })
      suggestions = (await res.json()) as NominatimResult[]
      showSuggestions = suggestions.length > 0
    } catch {
      suggestions = []; showSuggestions = false
    }
  }

  function selectSuggestion(s: NominatimResult) {
    address = s.display_name
    selectedLat = parseFloat(s.lat)
    selectedLng = parseFloat(s.lon)
    suggestions = []; showSuggestions = false
  }

  // ── Marcar en mapa ────────────────────────────────────────────────────────
  function activateMapPick() {
    onActivateMapPick((lat, lng, label) => {
      selectedLat = lat
      selectedLng = lng
      address = label
    })
  }

  // ── Toggle transporte ─────────────────────────────────────────────────────
  function toggleTransport(value: string) {
    if (selectedTransports.has(value)) {
      selectedTransports.delete(value)
    } else {
      selectedTransports.add(value)
    }
    selectedTransports = new Set(selectedTransports)
  }

  // ── Calcular ──────────────────────────────────────────────────────────────
  async function calculate() {
    const lat = selectedLat
    const lng = selectedLng
    if (lat === null || lng === null || selectedTransports.size === 0) return

    calculationOrigin = { lat, lng }
    isCalculating = true
    calculationError = null
    hasResults = false
    resultCount = null

    // Limpiar capas previas y restaurar el marcador de origen
    onClear()
    onSetOrigin(lat, lng)

    const transports = [...selectedTransports]
    try {
      const results = await Promise.all(
        transports.map(t =>
          api.geo.isochrone({ lat, lng, time: timeMinutes * 60, transport: t as "walking" | "cycling" | "driving" | "public_transport" })
        )
      )
      const layers: CacheLayer[] = []
      for (let i = 0; i < transports.length; i++) {
        const geojson = results[i] as GeoJSON
        const rings = extractRings(geojson)
        onCalculate(geojson, rings, lat, lng, transports[i]!)
        layers.push({ transport: transports[i]!, geojson })
      }
      void queryClient.invalidateQueries({ queryKey: orpc.tokens.balance.queryOptions().queryKey })
      saveToCache({ lat, lng, time: timeMinutes * 60, address }, layers)
      loadHistory()
      hasResults = true
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      if (e?.message === "NO_COVERAGE") calculationError = "NO_COVERAGE"
      else if (e?.code === "FORBIDDEN") calculationError = "FORBIDDEN"
      else if (e?.code === "UNAUTHORIZED") calculationError = "UNAUTHORIZED"
      else calculationError = "UNKNOWN"
    } finally {
      isCalculating = false
    }
  }

  function handleClear() {
    calculationError = null
    calculationOrigin = null
    hasResults = false
    resultCount = null
    onClear()
  }

  async function loadFromHistory(entry: CacheEntry) {
    isLoadingHistory = true
    await tick()
    selectedLat = entry.params.lat
    selectedLng = entry.params.lng
    if (entry.params.address) address = entry.params.address
    timeMinutes = Math.round(entry.params.time / 60)
    selectedTransports = new Set(entry.layers.map(l => l.transport))
    calculationOrigin = { lat: entry.params.lat, lng: entry.params.lng }
    for (const layer of entry.layers) {
      const rings = extractRings(layer.geojson)
      onCalculate(layer.geojson, rings, entry.params.lat, entry.params.lng, layer.transport)
    }
    hasResults = true
    calculationError = null
    isLoadingHistory = false
    activeTab = "calculate"
  }

  function extractRings(geojson: GeoJSON): number[][][] {
    if (geojson.type === "FeatureCollection" && geojson.features.length > 0) {
      const f = geojson.features[0]
      if (f?.geometry.type === "Polygon") return f.geometry.coordinates
      if (f?.geometry.type === "MultiPolygon") return f.geometry.coordinates[0] ?? []
    }
    if (geojson.type === "Feature") {
      if (geojson.geometry.type === "Polygon") return geojson.geometry.coordinates
    }
    return []
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  function startDrag(e: MouseEvent, el: HTMLElement) {
    isDragging = true
    const rect = el.getBoundingClientRect()
    dragOffsetX = e.clientX - rect.left
    dragOffsetY = e.clientY - rect.top
    document.addEventListener("mousemove", onDocMouseMove)
    document.addEventListener("mouseup", onDocMouseUp)
    e.preventDefault()
  }

  function onHeaderMouseDown(e: MouseEvent) {
    startDrag(e, (e.currentTarget as HTMLElement).parentElement!)
  }

  function onMiniMouseDown(e: MouseEvent) {
    startDrag(e, e.currentTarget as HTMLElement)
  }

  function onDocMouseMove(e: MouseEvent) {
    if (!isDragging) return
    panelX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffsetX))
    panelY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffsetY))
  }

  function onDocMouseUp() {
    isDragging = false
    document.removeEventListener("mousemove", onDocMouseMove)
    document.removeEventListener("mouseup", onDocMouseUp)
  }

  // ── Time input sincronizado ───────────────────────────────────────────────
  function onTimeInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value)
    if (!isNaN(v)) timeMinutes = Math.max(5, Math.min(180, v))
  }

  // ── Expuesto para index.ts ────────────────────────────────────────────────
  export function setResultCount(n: number) { resultCount = n }


</script>

{#if !minimized}
  <div
    class="panel"
    style={panelX !== null
      ? `left:${panelX}px;top:${panelY}px;right:auto`
      : `top:${panelY}px;right:12px`}
  >
    <!-- Loading overlay -->
    {#if isCalculating || isLoadingHistory}
      <div class="loading-overlay">
        <div class="loading-logo">M</div>
      </div>
    {/if}

    <!-- Header arrastrable -->
    <div
      class="panel-header"
      role="toolbar"
      tabindex="-1"
      onmousedown={onHeaderMouseDown}
      style="cursor:{isDragging ? 'grabbing' : 'grab'}"
    >
      <span class="panel-title">Mudar</span>
      <button class="btn-minimize" onclick={() => (minimized = true)} title="Minimizar">−</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab-btn"
        class:tab-active={activeTab === "calculate"}
        onclick={() => (activeTab = "calculate")}
      >Calcular</button>
      <button
        class="tab-btn"
        class:tab-active={activeTab === "history"}
        onclick={() => { activeTab = "history"; loadHistory() }}
      >Historial</button>
    </div>

    <div class="panel-body">

      {#if activeTab === "calculate"}

        <!-- Dirección -->
        <div class="field">
          <div class="field-label-row">
            <label class="field-label" for="mudar-address">Dirección</label>
            <span class="info-icon" aria-label="Información">
              ⓘ
              <span class="tooltip">Punto de origen del cálculo.<br>Por ejemplo: tu trabajo o un lugar de interés.</span>
            </span>
          </div>
          <div class="autocomplete">
            <input
              id="mudar-address"
              class="input"
              type="text"
              placeholder="Buscar dirección..."
              bind:value={address}
              oninput={onAddressInput}
              onblur={() => setTimeout(() => (showSuggestions = false), 150)}
            />
            {#if showSuggestions}
              <ul class="suggestions">
                {#each suggestions as s (s.place_id)}
                  <li>
                    <button class="suggestion-item" onmousedown={() => selectSuggestion(s)}>
                      {s.display_name}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <button class="btn-map-pick" onclick={activateMapPick}>
            📍 Marcar en mapa
          </button>
        </div>

        <!-- Tiempo -->
        <div class="field">
          <label class="field-label" for="mudar-time">Tiempo: {timeMinutes} min</label>
          <div class="time-controls">
            <input
              id="mudar-time"
              class="slider"
              type="range"
              min="5"
              max="180"
              step="5"
              bind:value={timeMinutes}
            />
            <input
              class="input input-number"
              type="number"
              min="5"
              max="180"
              value={timeMinutes}
              oninput={onTimeInput}
            />
          </div>
          <div class="slider-ticks">
            <span>30</span><span>60</span><span>90</span><span>120</span><span>180</span>
          </div>
        </div>

        <!-- Transporte -->
        <div class="field">
          <span class="field-label">Transporte</span>
          <div class="transport-grid">
            {#each TRANSPORT_OPTIONS as opt (opt.value)}
              <button
                class="transport-btn"
                class:active={selectedTransports.has(opt.value)}
                style={selectedTransports.has(opt.value)
                  ? `border-color:${opt.color};background:${opt.color}18;color:${opt.color}`
                  : ""}
                onclick={() => toggleTransport(opt.value)}
              >
                {opt.label}
                {#if opt.free}
                  <span class="badge-free">Gratis</span>
                {:else}
                  <span class="token-badge-wrap">
                    <span class="token-badge" style={selectedTransports.has(opt.value) ? `color:${opt.color}` : ""}>−1</span>
                    <span class="tooltip">Consume 1 token<br>por cálculo</span>
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Tokens / sesión -->
        <div class="tokens-row">
          {#if loggedIn}
            {#if $tokensQuery.isLoading}
              <span class="tokens-label muted">Cargando tokens...</span>
            {:else}
              <span class="tokens-label">
                <strong>{tokens ?? "—"}</strong> tokens disponibles
                {#if tokenCost > 0}
                  · este cálculo: <strong class="token-cost">−{tokenCost}</strong>
                {/if}
              </span>
            {/if}
          {:else}
            <a href="http://localhost:3001/sign-in" target="_blank" rel="noopener" class="link">
              Iniciá sesión para calcular
            </a>
          {/if}
        </div>

        <!-- Acciones -->
        <div class="actions">
          <button
            class="btn-primary"
            disabled={!canCalculate}
            onclick={calculate}
          >
            {isCalculating ? "Calculando..." : "Calcular zona"}
          </button>
          {#if hasResults}
            <button class="btn-secondary" onclick={handleClear}>Limpiar</button>
          {/if}
        </div>

        <!-- Toggle marcadores -->
        <button class="btn-toggle-markers" onclick={toggleMarkers}>
          {markersVisible ? "🙈 Ocultar propiedades" : "👁 Mostrar propiedades"}
        </button>

        <!-- Estado / resultado -->
        {#if calculationError === "NO_COVERAGE"}
          <p class="msg-error">Sin cobertura en esta zona. No se cobró token.</p>
        {:else if calculationError === "FORBIDDEN"}
          <p class="msg-error">Sin tokens suficientes.</p>
        {:else if calculationError === "UNAUTHORIZED"}
          <p class="msg-error">Iniciá sesión para calcular.</p>
        {:else if calculationError}
          <p class="msg-error">Error al calcular la isócrona.</p>
        {/if}
        {#if hasResults}
          <p class="msg-success">
            {resultCount !== null ? `${resultCount} propiedades en zona` : "Zona calculada ✓"}
          </p>
        {/if}

      {:else}

        <!-- ── Tab Historial ──────────────────────────────────────────────── -->
        <div class="history-list">
          {#if history.length === 0}
            <p class="muted" style="text-align:center;font-size:12px;margin:8px 0">Sin historial</p>
          {:else}
            {#each [...history].reverse() as entry, i (i)}
              <div class="history-entry">
                <div class="history-meta">
                  <span class="history-date">{formatDate(entry.timestamp)}</span>
                  <span class="history-mins">{Math.round(entry.params.time / 60)} min</span>
                </div>
                <div class="history-chips">
                  {#each entry.layers as layer}
                    <span
                      class="transport-chip"
                      style="background:{TRANSPORT_COLORS[layer.transport] ?? '#1a56db'}22;color:{TRANSPORT_COLORS[layer.transport] ?? '#1a56db'}"
                    >
                      {TRANSPORT_LABELS[layer.transport] ?? layer.transport}
                    </span>
                  {/each}
                </div>
                {#if entry.params.address}
                  <p class="history-address">{entry.params.address.length > 55 ? entry.params.address.slice(0, 55) + "…" : entry.params.address}</p>
                {/if}
                <button class="btn-load-history" onclick={() => loadFromHistory(entry)}>Cargar</button>
              </div>
            {/each}
          {/if}
        </div>

      {/if}

    </div>
  </div>
{:else}
  <div
    class="panel-mini"
    style="top:{panelY}px;{panelX !== null ? `left:${panelX}px;right:auto` : 'right:12px'};cursor:{isDragging ? 'grabbing' : 'grab'}"
    onmousedown={onMiniMouseDown}
    role="toolbar"
    tabindex="-1"
  >
    <span class="panel-title">Mudar</span>
    <div class="mini-actions">
      <button
        class="mini-btn"
        title={markersVisible ? "Ocultar propiedades" : "Mostrar propiedades"}
        onmousedown={(e) => e.stopPropagation()}
        onclick={toggleMarkers}
      >{markersVisible ? "🙈" : "👁"}</button>
      <button
        class="mini-expand"
        title="Abrir panel"
        onmousedown={(e) => e.stopPropagation()}
        onclick={() => (minimized = false)}
      >⊞</button>
    </div>
  </div>
{/if}

<style>
  :global(*) { box-sizing: border-box; }

  .panel {
    position: fixed;
    width: 310px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    z-index: 9999;
    color: #111827;
    user-select: none;
    pointer-events: auto;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #1a56db;
    border-radius: 12px 12px 0 0;
    color: #fff;
  }

  .panel-title { font-weight: 700; font-size: 14px; letter-spacing: 0.3px; }

  .btn-minimize {
    background: none; border: none; color: #fff; cursor: pointer;
    font-size: 18px; line-height: 1; padding: 0 2px; opacity: 0.8;
  }
  .btn-minimize:hover { opacity: 1; }

  /* Tabs */
  .tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
  }
  .tab-btn {
    flex: 1; padding: 8px; background: none; border: none; cursor: pointer;
    font-size: 12px; color: #6b7280;
    border-bottom: 2px solid transparent;
    font-family: inherit;
    transition: color 0.1s;
  }
  .tab-btn.tab-active {
    color: #1a56db; border-bottom-color: #1a56db; font-weight: 600;
  }
  .tab-btn:hover:not(.tab-active) { color: #374151; }

  .panel-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; }

  .field { display: flex; flex-direction: column; gap: 5px; }

  .field-label-row { display: flex; align-items: center; gap: 5px; }

  .field-label {
    font-size: 11px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 0.4px;
  }

  /* Tooltip genérico */
  .info-icon, .token-badge-wrap {
    position: relative; display: inline-flex; align-items: center; cursor: help;
  }

  .info-icon { font-size: 12px; color: #9ca3af; }

  .tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: #fff;
    font-size: 11px;
    line-height: 1.4;
    padding: 6px 8px;
    border-radius: 6px;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    text-align: center;
  }

  .info-icon:hover .tooltip,
  .token-badge-wrap:hover .tooltip { display: block; }

  .autocomplete { position: relative; }

  .input {
    width: 100%; padding: 7px 10px;
    border: 1px solid #d1d5db; border-radius: 7px;
    font-size: 13px; outline: none; color: #111827; background: #f9fafb;
  }
  .input:focus { border-color: #1a56db; background: #fff; }

  .input-number { width: 64px; padding: 5px 8px; }

  .suggestions {
    position: absolute; top: 100%; left: 0; right: 0;
    background: #fff; border: 1px solid #d1d5db; border-top: none;
    border-radius: 0 0 7px 7px; max-height: 160px; overflow-y: auto;
    z-index: 10000; list-style: none; margin: 0; padding: 0;
  }

  .suggestion-item {
    display: block; width: 100%; text-align: left;
    padding: 7px 10px; background: none; border: none;
    cursor: pointer; font-size: 12px; color: #374151; line-height: 1.4;
  }
  .suggestion-item:hover { background: #f3f4f6; }

  .btn-map-pick {
    padding: 5px 10px; background: #f3f4f6; border: 1px solid #e5e7eb;
    border-radius: 6px; font-size: 11px; color: #374151; cursor: pointer;
    align-self: flex-start;
  }
  .btn-map-pick:hover { background: #e5e7eb; }

  .time-controls { display: flex; align-items: center; gap: 8px; }

  .slider { flex: 1; accent-color: #1a56db; cursor: pointer; }

  .slider-ticks {
    display: flex; justify-content: space-between;
    font-size: 10px; color: #9ca3af; padding: 0 2px;
  }

  .transport-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

  .transport-btn {
    padding: 7px 6px; border: 1px solid #e5e7eb; border-radius: 7px;
    background: #f9fafb; cursor: pointer; font-size: 12px; color: #374151;
    display: flex; align-items: center; justify-content: center;
    gap: 4px; transition: all 0.15s; position: relative;
    font-family: inherit;
  }
  .transport-btn.active { font-weight: 600; }

  .badge-free { font-size: 10px; color: #16a34a; font-weight: 700; }

  .token-badge { font-size: 10px; color: #f59e0b; font-weight: 700; }

  .token-cost { color: #f59e0b; }

  .tokens-row { font-size: 12px; color: #6b7280; text-align: center; }
  .muted { color: #9ca3af; }

  .link { color: #1a56db; text-decoration: none; font-size: 12px; }
  .link:hover { text-decoration: underline; }

  .actions { display: flex; gap: 8px; }

  .btn-primary {
    flex: 1; padding: 9px; background: #1a56db; color: #fff;
    border: none; border-radius: 8px; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: background 0.15s;
    font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { background: #1e40af; }
  .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }

  .btn-secondary {
    padding: 9px 14px; background: #f3f4f6; color: #374151;
    border: 1px solid #e5e7eb; border-radius: 8px;
    font-size: 13px; cursor: pointer; font-family: inherit;
  }
  .btn-secondary:hover { background: #e5e7eb; }

  .msg-error { font-size: 12px; color: #dc2626; text-align: center; margin: 0; }
  .msg-success { font-size: 12px; color: #16a34a; text-align: center; margin: 0; }

  .btn-toggle-markers {
    width: 100%; padding: 7px; background: #f9fafb;
    border: 1px solid #e5e7eb; border-radius: 7px;
    font-size: 12px; color: #374151; cursor: pointer; text-align: center;
    font-family: inherit;
  }
  .btn-toggle-markers:hover { background: #f3f4f6; }

  /* Historial */
  .history-list { display: flex; flex-direction: column; gap: 8px; }

  .history-entry {
    border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px;
    display: flex; flex-direction: column; gap: 4px;
  }

  .history-meta {
    display: flex; justify-content: space-between;
    font-size: 11px; color: #9ca3af;
  }

  .history-chips { display: flex; gap: 4px; flex-wrap: wrap; }

  .transport-chip {
    font-size: 12px; padding: 2px 8px; border-radius: 999px; font-weight: 600;
  }

  .history-address { font-size: 11px; color: #6b7280; margin: 0; }

  .btn-load-history {
    align-self: flex-end; padding: 4px 10px; font-size: 11px;
    background: #eff6ff; border: 1px solid #bfdbfe; color: #1a56db;
    border-radius: 6px; cursor: pointer; font-family: inherit;
  }
  .btn-load-history:hover { background: #dbeafe; }

  /* Mini panel (minimizado) */
  .panel-mini {
    position: fixed;
    width: 310px;
    background: #1a56db;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    z-index: 9999;
    color: #fff;
    user-select: none;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
  }

  .mini-actions { display: flex; align-items: center; gap: 6px; }

  .mini-btn {
    background: none; border: none; color: #fff; cursor: pointer;
    font-size: 15px; padding: 3px 5px; opacity: 0.85; border-radius: 5px;
    line-height: 1;
  }
  .mini-btn:hover { opacity: 1; background: rgba(255,255,255,0.15); }

  .mini-expand {
    background: rgba(255,255,255,0.2); border: none; color: #fff;
    cursor: pointer; font-size: 15px; padding: 3px 7px;
    border-radius: 6px; line-height: 1;
  }
  .mini-expand:hover { background: rgba(255,255,255,0.35); }

  /* Loading overlay */
  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    border-radius: 12px;
    backdrop-filter: blur(2px);
  }

  .loading-logo {
    font-size: 52px;
    font-weight: 900;
    color: #1a56db;
    line-height: 1;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    animation: mudar-pulse 1.4s ease-in-out infinite;
  }

  @keyframes mudar-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.82); }
  }
</style>
