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
    onToggleOutside: (show: boolean) => void
    onSetOrigin: (lat: number | null, lng: number | null) => void
    onToggleLayer: (transport: string, visible: boolean) => void
  }
  const { getMapCenter, onCalculate, onClear, onActivateMapPick, onToggleMarkers, onToggleOutside, onSetOrigin, onToggleLayer }: Props = $props()

  // ── Constantes de transporte ───────────────────────────────────────────────
  const TRANSPORT_OPTIONS = [
    { value: "walking",          label: "🚶 Caminando",     color: "#16a34a" },
    { value: "cycling",          label: "🚲 Bici",           color: "#f59e0b" },
    { value: "driving",          label: "🚗 Auto",           color: "#dc2626" },
    { value: "public_transport", label: "🚌 Trans. público", color: "#7c3aed" },
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
  let viewMode = $state<"form" | "results">("form")
  let resultTransports = $state<string[]>([])
  let hiddenLayers = $state(new Set<string>())

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
  let showOutside = $state(false)
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

  function toggleOutside() {
    showOutside = !showOutside
    onToggleOutside(showOutside)
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
  const tokenCost = $derived(selectedTransports.size)
  const canCalculate = $derived(
    loggedIn &&
    !isCalculating &&
    selectedLat !== null &&
    selectedLng !== null &&
    selectedTransports.size > 0 &&
    tokens !== null && tokens >= tokenCost
  )

  // ── Estado upsell banner ──────────────────────────────────────────────────
  let upsellDismissed = $state(false)
  const showUpsell = $derived(
    loggedIn && tokens !== null && tokens <= 3 && !upsellDismissed
  )

  const API_BASE = import.meta.env.WXT_API_BASE as string

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
      const res = await fetch(url, { headers: { "User-Agent": "Mudarg-Extension/1.0" } })
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
  const MAX_TRANSPORTS = 2

  function toggleTransport(value: string) {
    if (selectedTransports.has(value)) {
      selectedTransports.delete(value)
    } else if (selectedTransports.size < MAX_TRANSPORTS) {
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
      resultTransports = transports
      hiddenLayers = new Set()
      viewMode = "results"
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
    viewMode = "form"
    resultTransports = []
    hiddenLayers = new Set()
    
    // Reset form fields
    address = ""
    selectedLat = null
    selectedLng = null
    timeMinutes = 30
    selectedTransports = new Set(["walking"])
    
    onClear()
  }

  function toggleLayer(transport: string) {
    if (hiddenLayers.has(transport)) hiddenLayers.delete(transport)
    else hiddenLayers.add(transport)
    hiddenLayers = new Set(hiddenLayers)
    onToggleLayer(transport, !hiddenLayers.has(transport))
  }

  async function loadFromHistory(entry: CacheEntry) {
    isLoadingHistory = true
    // Ensure the browser has time to render the loading overlay before the heavy parsing blocks the main thread
    await new Promise(resolve => setTimeout(resolve, 50))
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
    resultTransports = entry.layers.map(l => l.transport)
    hiddenLayers = new Set()
    viewMode = "results"
  }

  function extractRings(geojson: GeoJSON): number[][][] {
    const rings: number[][][] = []
    if (geojson.type === "FeatureCollection") {
      for (const f of geojson.features) {
        if (f.geometry.type === "Polygon" && f.geometry.coordinates[0])
          rings.push(f.geometry.coordinates[0])
        else if (f.geometry.type === "MultiPolygon") {
          for (const poly of f.geometry.coordinates)
            if (poly[0]) rings.push(poly[0])
        }
      }
      return rings
    }
    if (geojson.type === "Feature") {
      if (geojson.geometry.type === "Polygon") return [geojson.geometry.coordinates[0]!]
      if (geojson.geometry.type === "MultiPolygon")
        return geojson.geometry.coordinates.map(p => p[0]!)
    }
    return rings
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
      <span class="panel-title">Mudarg</span>
      <button class="btn-minimize" onclick={() => (minimized = true)} title="Minimizar">−</button>
    </div>

    <!-- Tabs — ocultas cuando hay un cálculo activo -->
    {#if viewMode === "form"}
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
    {/if}

    <div class="panel-body">

      {#if activeTab === "calculate"}

      {#if viewMode === "results"}
        <!-- ── Vista de resultados ──────────────────────────────────────── -->
        <div class="results-count">
          <span class="results-number">{resultCount ? resultCount : "—"}</span>
          <span class="results-sub">propiedades a {timeMinutes} min</span>
        </div>

        {#if address}
          <p class="results-address">📍 {address.length > 60 ? address.slice(0, 60) + "…" : address}</p>
        {/if}

        <div class="layers-list">
          {#each resultTransports as transport (transport)}
            {@const color = TRANSPORT_COLORS[transport] ?? "#1a56db"}
            {@const label = TRANSPORT_OPTIONS.find(o => o.value === transport)?.label ?? transport}
            {@const hidden = hiddenLayers.has(transport)}
            <div class="layer-row" class:layer-hidden={hidden}>
              <span class="layer-dot" style="background:{color}"></span>
              <span class="layer-name">{label}</span>
              <button
                class="btn-layer-toggle"
                onclick={() => toggleLayer(transport)}
                title={hidden ? "Mostrar zona" : "Ocultar zona"}
              >
                {hidden ? "👁️" : "❌"}
              </button>
            </div>
          {/each}
        </div>

        <div class="toggle-row">
          <button class="btn-toggle-markers" onclick={toggleMarkers}>
            {markersVisible ? "❌ Ocultar" : "👁️ Mostrar"}
          </button>
          <button class="btn-toggle-markers" class:btn-toggle-active={showOutside} onclick={toggleOutside}>
            {showOutside ? "🔍 Solo zona" : "🌐 Ver afuera"}
          </button>
        </div>

        <button class="btn-new-search" onclick={handleClear}>
          ← Nueva búsqueda
        </button>

      {:else}
        <!-- ── Formulario de cálculo ─────────────────────────────────────── -->

        {#if !loggedIn && !$tokensQuery.isLoading}
          <!-- Overlay de login — cubre el form con blur -->
          <div class="login-gate">
            <div class="login-gate-content">
              <p class="login-gate-msg">Iniciá sesión para usar Mudarg</p>
              <a href="{API_BASE}/sign-in" target="_blank" rel="noopener" class="btn-primary btn-login-gate">
                Iniciar sesión
              </a>
              <a href="{API_BASE}/sign-up" target="_blank" rel="noopener" class="login-gate-register">
                ¿No tenés cuenta? Registrate
              </a>
            </div>
          </div>
        {/if}

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
          <div class="field-label-row">
            <span class="field-label">Transporte</span>
            <span class="field-hint">máx. {MAX_TRANSPORTS}</span>
          </div>
          <div class="transport-grid">
            {#each TRANSPORT_OPTIONS as opt (opt.value)}
              {@const isSelected = selectedTransports.has(opt.value)}
              {@const isDisabled = !isSelected && selectedTransports.size >= MAX_TRANSPORTS}
              <button
                class="transport-btn"
                class:active={isSelected}
                class:transport-disabled={isDisabled}
                style={isSelected
                  ? `border-color:${opt.color};background:${opt.color}18;color:${opt.color}`
                  : ""}
                onclick={() => toggleTransport(opt.value)}
              >
                {opt.label}
                <span class="token-badge-wrap">
                  <span class="token-badge" style={selectedTransports.has(opt.value) ? `color:${opt.color}` : ""}>−1</span>
                  <span class="tooltip">Consume 1 token<br>por cálculo</span>
                </span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Tokens / sesión -->
        {#if !loggedIn}
          <div class="tokens-row">
            <a href="{API_BASE}/sign-in" target="_blank" rel="noopener" class="link">
              Iniciá sesión para calcular
            </a>
          </div>
        {:else if $tokensQuery.isLoading}
          <div class="tokens-row">
            <span class="muted">Cargando tokens...</span>
          </div>
        {:else if tokens === 0}
          <div class="tokens-empty">
            <span>Sin tokens para calcular</span>
            <a href="{API_BASE}/dashboard/tokens" target="_blank" rel="noopener" class="btn-buy-tokens">
              Comprar tokens →
            </a>
          </div>
        {:else if tokens !== null && tokens <= 3}
          <div class="tokens-row tokens-low">
            <span>⚠️ <strong>{tokens}</strong> tokens — ¡casi sin saldo!</span>
            <a href="{API_BASE}/dashboard/tokens" target="_blank" rel="noopener" class="link-buy">Comprar más →</a>
          </div>
        {:else}
          <div class="tokens-row tokens-ok">
            <span>✓ <strong>{tokens}</strong> tokens</span>
            {#if tokenCost > 0}
              <span class="token-cost-hint">· −{tokenCost} en este cálculo</span>
            {/if}
          </div>
        {/if}

        <!-- Banner upsell (colapsable, solo cuando saldo <= 3) -->
        {#if showUpsell}
          <div class="upsell-banner">
            <div class="upsell-content">
              <span class="upsell-text">🎯 10 tokens por <strong>$16.000</strong></span>
              <a href="{API_BASE}/dashboard/tokens" target="_blank" rel="noopener" class="btn-upsell">Ver packs</a>
            </div>
            <button class="btn-upsell-close" onclick={() => (upsellDismissed = true)}>×</button>
          </div>
        {/if}

        <!-- Acciones -->
        <div class="actions">
          <button
            class="btn-primary"
            disabled={!canCalculate}
            onclick={calculate}
          >
            {#if isCalculating}
              Calculando...
            {:else if tokenCost > 0}
              Calcular zona · −{tokenCost} 🪙
            {:else}
              Calcular zona
            {/if}
          </button>
          {#if hasResults}
            <button class="btn-secondary" onclick={handleClear}>Limpiar</button>
          {/if}
        </div>

        <!-- Link de compra cuando no puede calcular por falta de tokens -->
        <!-- {#if loggedIn && tokens !== null && tokens < tokenCost && !isCalculating}
          <a href="{API_BASE}/dashboard/tokens" target="_blank" rel="noopener" class="link-insuf">
            Comprá más tokens para calcular →
          </a>
        {/if} -->

        <!-- Toggle marcadores -->
        <button class="btn-toggle-markers" onclick={toggleMarkers}>
          {markersVisible ? "❌ Ocultar propiedades" : "👁️ Mostrar propiedades"}
        </button>

        <!-- Estado / error -->
        {#if calculationError === "NO_COVERAGE"}
          <p class="msg-error">Sin cobertura en esta zona. No se cobró token.</p>
        {:else if calculationError === "FORBIDDEN"}
          <p class="msg-error">Sin tokens suficientes.</p>
        {:else if calculationError === "UNAUTHORIZED"}
          <p class="msg-error">Iniciá sesión para calcular.</p>
        {:else if calculationError}
          <p class="msg-error">Error al calcular la isócrona.</p>
        {/if}

      {/if} <!-- /viewMode -->

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
    <span class="panel-title">Mudarg</span>
    <div class="mini-actions">
      <span>{resultCount ? "📍" + resultCount : null}</span>
      <button
        class="mini-btn"
        title={markersVisible ? "Ocultar propiedades" : "Mostrar propiedades"}
        onmousedown={(e) => e.stopPropagation()}
        onclick={toggleMarkers}
      >{markersVisible ? "❌" : "👁️"}</button>
      <button
        class="mini-btn"
        title={showOutside ? "Ocultar propiedades fuera del area" : "Mostrar propiedades fuera del area"}
        onmousedown={(e) => e.stopPropagation()}
        onclick={toggleOutside}
      >{showOutside ? "🔍" : "🌐"}</button>
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
    background: var(--color-surface);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-float);
    font-family: var(--font-sans);
    font-size: 13px;
    z-index: 2147483646;
    color: var(--color-foreground);
    user-select: none;
    pointer-events: auto;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--color-primary);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    color: var(--color-primary-foreground);
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
    font-size: 12px; color: var(--color-muted-foreground);
    border-bottom: 2px solid transparent;
    font-family: inherit;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tab-btn.tab-active {
    color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600;
  }
  .tab-btn:hover:not(.tab-active) { color: var(--color-foreground); }

  .panel-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; position: relative; }

  .field { display: flex; flex-direction: column; gap: 5px; }

  .field-label-row { display: flex; align-items: center; gap: 5px; justify-content: space-between; }
  .field-hint { font-size: 11px; color: var(--color-muted-foreground); }

  .field-label {
    font-size: 11px; font-weight: 600; color: var(--color-muted-foreground);
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
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: #fff;
    font-size: 11px;
    line-height: 1.4;
    padding: 6px 8px;
    border-radius: 6px;
    white-space: nowrap;
    z-index: 2147483647;
    pointer-events: none;
    text-align: center;
  }

  .info-icon:hover .tooltip,
  .token-badge-wrap:hover .tooltip { display: block; }

  .autocomplete { position: relative; }

  .input {
    width: 100%; padding: 7px 10px;
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    font-size: 13px; outline: none; color: var(--color-foreground); background: var(--color-muted);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .input:focus { border-color: var(--color-primary); background: var(--color-background); box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary); }

  .input-number { width: 64px; padding: 5px 8px; }

  .suggestions {
    position: absolute; top: 100%; left: 0; right: 0;
    background: #fff; border: 1px solid #d1d5db; border-top: none;
    border-radius: 0 0 7px 7px; max-height: 160px; overflow-y: auto;
    z-index: 2147483647; list-style: none; margin: 0; padding: 0;
  }

  .suggestion-item {
    display: block; width: 100%; text-align: left;
    padding: 7px 10px; background: none; border: none;
    cursor: pointer; font-size: 12px; color: #374151; line-height: 1.4;
  }
  .suggestion-item:hover { background: #f3f4f6; }

  .btn-map-pick {
    padding: 5px 10px; background: var(--color-muted); border: 1px solid var(--color-border);
    border-radius: var(--radius-md); font-size: 11px; color: var(--color-foreground); cursor: pointer;
    align-self: flex-start; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-map-pick:hover { background: var(--color-border); }
  .btn-map-pick:active { transform: scale(0.98); }

  .time-controls { display: flex; align-items: center; gap: 8px; }

  .slider { flex: 1; accent-color: #1a56db; cursor: pointer; }

  .slider-ticks {
    display: flex; justify-content: space-between;
    font-size: 10px; color: #9ca3af; padding: 0 2px;
  }

  .transport-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

  .transport-btn {
    padding: 7px 6px; border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    background: var(--color-muted); cursor: pointer; font-size: 12px; color: var(--color-muted-foreground);
    display: flex; align-items: center; justify-content: center;
    gap: 4px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
    font-family: inherit;
  }
  .transport-btn:active { transform: scale(0.98); }
  .transport-btn.active { font-weight: 600; color: var(--color-foreground); }
  .transport-btn.transport-disabled { opacity: 0.38; cursor: not-allowed; }

  .token-badge { font-size: 10px; color: #f59e0b; font-weight: 700; }

  .tokens-row { font-size: 12px; color: #6b7280; display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
  .tokens-ok { color: #16a34a; }
  .tokens-low { color: #d97706; }
  .token-cost-hint { color: #9ca3af; }

  .tokens-empty {
    display: flex; align-items: center; justify-content: space-between;
    background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
    padding: 8px 12px; font-size: 12px; color: #dc2626; font-weight: 600;
  }

  .btn-buy-tokens {
    display: inline-block; padding: 4px 10px;
    background: #dc2626; color: #fff; border-radius: 6px;
    font-size: 11px; font-weight: 700; text-decoration: none;
    white-space: nowrap;
  }
  .btn-buy-tokens:hover { background: #b91c1c; }

  .link-buy { color: #d97706; font-weight: 600; text-decoration: none; white-space: nowrap; }
  .link-buy:hover { text-decoration: underline; }

  .upsell-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px;
  }
  .upsell-content { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
  .upsell-text { font-size: 12px; color: #1e40af; }
  .btn-upsell {
    display: inline-block; padding: 3px 10px;
    background: #1a56db; color: #fff; border-radius: 6px;
    font-size: 11px; font-weight: 700; text-decoration: none; white-space: nowrap;
  }
  .btn-upsell:hover { background: #1e40af; }
  .btn-upsell-close {
    background: none; border: none; color: #93c5fd; cursor: pointer;
    font-size: 16px; line-height: 1; padding: 0 2px; flex-shrink: 0;
  }
  .btn-upsell-close:hover { color: #1a56db; }

  .muted { color: #9ca3af; }

  .link { color: #1a56db; text-decoration: none; font-size: 12px; }
  .link:hover { text-decoration: underline; }

  .actions { display: flex; gap: 8px; }

  .btn-primary {
    flex: 1; padding: 9px; background: var(--color-primary); color: var(--color-primary-foreground);
    border: none; border-radius: var(--radius-lg); font-size: 13px;
    font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); }
  .btn-primary:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-secondary {
    padding: 9px 14px; background: var(--color-secondary); color: var(--color-secondary-foreground);
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-secondary:hover { background: var(--color-border); transform: translateY(-1px); }
  .btn-secondary:active { transform: translateY(0) scale(0.98); }

  .msg-error { font-size: 12px; color: #dc2626; text-align: center; margin: 0; }

  /* Login gate */
  .login-gate {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--color-surface) 85%, transparent);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }
  .login-gate-content {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 24px 20px; text-align: center;
  }
  .login-gate-msg {
    font-size: 13px; font-weight: 600; color: var(--color-foreground);
    margin: 0; line-height: 1.4;
  }
  .btn-login-gate { width: 100%; text-align: center; text-decoration: none; }
  .login-gate-register {
    font-size: 11px; color: var(--color-muted-foreground);
    text-decoration: none;
  }
  .login-gate-register:hover { text-decoration: underline; }

  /* Vista de resultados */
  .results-count {
    display: flex; flex-direction: column; align-items: center;
    padding: 12px 0 8px; gap: 2px;
  }
  .results-number { font-size: 42px; font-weight: 800; color: var(--color-primary); line-height: 1; }
  .results-sub { font-size: 12px; color: var(--color-muted-foreground); }
  .results-address {
    font-size: 11px; color: var(--color-muted-foreground);
    text-align: center; margin: 0 0 4px; padding: 0 4px;
    line-height: 1.4; word-break: break-word;
  }

  .layers-list { display: flex; flex-direction: column; gap: 6px; }

  .layer-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    background: var(--color-muted); transition: opacity 0.2s;
  }
  .layer-row.layer-hidden { opacity: 0.45; }

  .layer-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .layer-name { flex: 1; font-size: 12px; color: #374151; font-weight: 500; }

  .btn-layer-toggle {
    background: none; border: none; cursor: pointer;
    font-size: 14px; padding: 2px 4px; line-height: 1; border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  .btn-layer-toggle:hover { background: var(--color-border); transform: scale(1.05); }

  .btn-new-search {
    width: 100%; padding: 9px; background: var(--color-muted);
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; color: var(--color-foreground);
    cursor: pointer; font-family: inherit; text-align: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-new-search:hover { background: var(--color-border); }
  .btn-new-search:active { transform: scale(0.98); }

  .toggle-row { display: flex; gap: 6px; }
  .toggle-row .btn-toggle-markers { width: auto; flex: 1; }
  .btn-toggle-markers {
    width: 100%; padding: 7px; background: var(--color-muted);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    font-size: 12px; color: var(--color-foreground); cursor: pointer; text-align: center;
    font-family: inherit; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-toggle-markers:hover { background: var(--color-border); }
  .btn-toggle-markers:active { transform: scale(0.98); }
  .btn-toggle-active { background: var(--color-primary) !important; color: var(--color-primary-foreground) !important; border-color: var(--color-primary) !important; }

  /* Historial */
  .history-list { display: flex; flex-direction: column; gap: 8px; }

  .history-entry {
    border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 8px 10px;
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
    background: var(--color-primary);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-float);
    font-family: var(--font-sans);
    font-size: 13px;
    z-index: 2147483646;
    color: var(--color-primary-foreground);
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
    z-index: 2147483647;
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
