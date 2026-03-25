<script lang="ts">
  import {
    QueryClient,
    setQueryClientContext,
    createQuery,
    createMutation,
  } from "@tanstack/svelte-query"
  import { orpc, api } from "@/api"
  import type { GeoJSON } from "./overlay"

  // ── QueryClient ───────────────────────────────────────────────────────────
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  })
  setQueryClientContext(queryClient)

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props {
    getMapCenter: () => { lat: number; lng: number } | null
    onCalculate: (geojson: GeoJSON, polyRings: number[][][], lat: number, lng: number) => void
    onClear: () => void
    onActivateMapPick: (cb: (lat: number, lng: number, label: string) => void) => void
    onToggleMarkers: (visible: boolean) => void
    onSetOrigin: (lat: number | null, lng: number | null) => void
  }
  const { getMapCenter, onCalculate, onClear, onActivateMapPick, onToggleMarkers, onSetOrigin }: Props = $props()

  // ── Estado UI ─────────────────────────────────────────────────────────────
  let minimized = $state(false)
  let panelX = $state<number | null>(null)
  let panelY = $state(80)
  let isDragging = $state(false)
  let dragOffsetX = 0
  let dragOffsetY = 0

  // ── Estado del formulario ─────────────────────────────────────────────────
  let address = $state("")
  let suggestions = $state<NominatimResult[]>([])
  let showSuggestions = $state(false)
  let selectedLat = $state<number | null>(null)
  let selectedLng = $state<number | null>(null)
  let timeMinutes = $state(30)
  let transport = $state<"walking" | "cycling" | "driving" | "public_transport">("walking")
  let resultCount = $state<number | null>(null)
  let markersVisible = $state(true)
  let calculationOrigin = $state<{ lat: number; lng: number } | null>(null)

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
  // El background hace el fetch con credentials → no hay CORS desde el content script
  const tokensQuery = createQuery(orpc.user.tokens.queryOptions())

  const tokens = $derived(($tokensQuery.data as { tokens: number } | undefined)?.tokens ?? null)
  // Logueado si tokens cargaron sin error de autenticación
  const loggedIn = $derived(
    $tokensQuery.data !== undefined ||
    ($tokensQuery.isError && ($tokensQuery.error as { code?: string })?.code !== "UNAUTHORIZED")
  )

  // ── TanStack Query: isócrona mutation ────────────────────────────────────
  const isochrone = createMutation({
    mutationFn: (params: Parameters<typeof api.geo.isochrone>[0]) =>
      api.geo.isochrone(params),
  })

  // Notificar cambio de origen al overlay
  $effect(() => {
    onSetOrigin(selectedLat, selectedLng)
  })

  // Cuando hay resultado de isócrona, disparar el dibujo del overlay
  $effect(() => {
    if ($isochrone.data && calculationOrigin) {
      const geojson = $isochrone.data as GeoJSON
      const rings = extractRings(geojson)
      onCalculate(geojson, rings, calculationOrigin.lat, calculationOrigin.lng)
    }
  })

  const isFree = $derived(transport === "walking")
  const canCalculate = $derived(
    loggedIn &&
    !$isochrone.isPending &&
    selectedLat !== null &&
    selectedLng !== null &&
    (isFree || (tokens !== null && tokens > 0))
  )
  // silence unused import warning
  void api

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

  // ── Calcular ──────────────────────────────────────────────────────────────
  function calculate() {
    const lat = selectedLat
    const lng = selectedLng
    if (lat === null || lng === null) return

    calculationOrigin = { lat, lng }
    $isochrone.mutate(
      { lat, lng, time: timeMinutes * 60, transport },
      {
        onSuccess: () => {
          if (!isFree) {
            void queryClient.invalidateQueries({ queryKey: orpc.user.tokens.queryOptions().queryKey })
          }
        },
      }
    )
  }

  function handleClear() {
    $isochrone.reset()
    resultCount = null
    calculationOrigin = null
    onClear()
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
  function onHeaderMouseDown(e: MouseEvent) {
    isDragging = true
    const panel = (e.currentTarget as HTMLElement).parentElement!
    const rect = panel.getBoundingClientRect()
    dragOffsetX = e.clientX - rect.left
    dragOffsetY = e.clientY - rect.top
    document.addEventListener("mousemove", onDocMouseMove)
    document.addEventListener("mouseup", onDocMouseUp)
    e.preventDefault()
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

    <div class="panel-body">

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
          {#each [
            { value: "walking", label: "🚶 Caminando", free: true },
            { value: "cycling", label: "🚲 Bici", free: false },
            { value: "driving", label: "🚗 Auto", free: false },
            { value: "public_transport", label: "🚌 Bus", free: false },
          ] as opt (opt.value)}
            <button
              class="transport-btn"
              class:active={transport === opt.value}
              onclick={() => (transport = opt.value as typeof transport)}
            >
              {opt.label}
              {#if opt.free}
                <span class="badge-free">Gratis</span>
              {:else}
                <span class="token-badge-wrap">
                  <span class="token-badge">−1</span>
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
          {$isochrone.isPending ? "Calculando..." : "Calcular zona"}
        </button>
        {#if $isochrone.isSuccess}
          <button class="btn-secondary" onclick={handleClear}>Limpiar</button>
        {/if}
      </div>

      <!-- Toggle marcadores -->
      <button class="btn-toggle-markers" onclick={toggleMarkers}>
        {markersVisible ? "🙈 Ocultar propiedades" : "👁 Mostrar propiedades"}
      </button>

      <!-- Estado / resultado -->
      {#if $isochrone.isError}
        {#if ($isochrone.error as Error)?.message === "NO_COVERAGE"}
          <p class="msg-error">Sin cobertura en esta zona. No se cobró token.</p>
        {:else if ($isochrone.error as { code?: string })?.code === "FORBIDDEN"}
          <p class="msg-error">Sin tokens suficientes.</p>
        {:else if ($isochrone.error as { code?: string })?.code === "UNAUTHORIZED"}
          <p class="msg-error">Iniciá sesión para calcular.</p>
        {:else}
          <p class="msg-error">Error al calcular la isócrona.</p>
        {/if}
      {/if}
      {#if $isochrone.isSuccess}
        <p class="msg-success">
          {resultCount !== null ? `${resultCount} propiedades en zona` : "Zona calculada ✓"}
        </p>
      {/if}
    </div>
  </div>
{:else}
  <button
    class="btn-expand"
    style="top:{panelY}px;{panelX !== null ? `left:${panelX}px;right:auto` : 'right:12px'}"
    onclick={() => (minimized = false)}
  >
    Mudar ▲
  </button>
{/if}

<style>
  :global(*) { box-sizing: border-box; }

  .panel {
    position: fixed;
    width: 310px;
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

  .panel-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; }

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
    gap: 4px; transition: all 0.1s; position: relative;
  }
  .transport-btn.active {
    border-color: #1a56db; background: #eff6ff;
    color: #1a56db; font-weight: 600;
  }

  .badge-free { font-size: 10px; color: #16a34a; font-weight: 700; }

  .token-badge { font-size: 10px; color: #f59e0b; font-weight: 700; }

  .tokens-row { font-size: 12px; color: #6b7280; text-align: center; }
  .muted { color: #9ca3af; }

  .link { color: #1a56db; text-decoration: none; font-size: 12px; }
  .link:hover { text-decoration: underline; }

  .actions { display: flex; gap: 8px; }

  .btn-primary {
    flex: 1; padding: 9px; background: #1a56db; color: #fff;
    border: none; border-radius: 8px; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: background 0.15s;
  }
  .btn-primary:hover:not(:disabled) { background: #1e40af; }
  .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }

  .btn-secondary {
    padding: 9px 14px; background: #f3f4f6; color: #374151;
    border: 1px solid #e5e7eb; border-radius: 8px;
    font-size: 13px; cursor: pointer;
  }
  .btn-secondary:hover { background: #e5e7eb; }

  .msg-error { font-size: 12px; color: #dc2626; text-align: center; margin: 0; }
  .msg-success { font-size: 12px; color: #16a34a; text-align: center; margin: 0; }

  .btn-toggle-markers {
    width: 100%; padding: 7px; background: #f9fafb;
    border: 1px solid #e5e7eb; border-radius: 7px;
    font-size: 12px; color: #374151; cursor: pointer; text-align: center;
  }
  .btn-toggle-markers:hover { background: #f3f4f6; }

  .btn-expand {
    position: fixed; padding: 6px 12px; background: #1a56db;
    color: #fff; border: none; border-radius: 8px;
    font-size: 12px; font-weight: 600; cursor: pointer; z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    pointer-events: auto;
  }
</style>
