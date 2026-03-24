<script lang="ts">
  import type { GeoJSON } from "./overlay"

  // ── Props desde index.ts ──────────────────────────────────────────────────
  interface Props {
    getMapCenter: () => { lat: number; lng: number } | null
    onCalculate: (geojson: GeoJSON, polyRings: number[][][]) => void
    onClear: () => void
  }
  const { getMapCenter, onCalculate, onClear }: Props = $props()

  // ── Estado ────────────────────────────────────────────────────────────────
  let minimized = $state(false)
  let address = $state("")
  let suggestions = $state<NominatimResult[]>([])
  let showSuggestions = $state(false)
  let selectedLat = $state<number | null>(null)
  let selectedLng = $state<number | null>(null)
  let timeMinutes = $state(30)
  let transport = $state<"walking" | "cycling" | "driving" | "public_transport">("walking")
  let tokens = $state<number | null>(null)
  let status = $state<"idle" | "loading" | "success" | "error">("idle")
  let statusMsg = $state("")
  let resultCount = $state<number | null>(null)
  let session = $state<{ email: string } | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout>

  interface NominatimResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
  }

  // ── Cargar sesión y tokens al montar ─────────────────────────────────────
  $effect(() => {
    loadSession()
  })

  async function loadSession() {
    try {
      const res = await fetch("http://localhost:3001/api/orpc/user.tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      if (res.status === 401) {
        session = null
        tokens = null
        return
      }
      if (res.ok) {
        // Obtener info de sesión
        const sessRes = await fetch("http://localhost:3001/api/auth/get-session", {
          credentials: "include",
        })
        if (sessRes.ok) {
          const sessData = await sessRes.json() as { user?: { email: string } } | null
          session = sessData?.user ? { email: sessData.user.email } : null
        }
        const data = await res.json() as { result?: { tokens: number } }
        tokens = data.result?.tokens ?? 0
      }
    } catch {
      session = null
      tokens = null
    }
  }

  // ── Geocoding Nominatim ───────────────────────────────────────────────────
  function onAddressInput() {
    clearTimeout(debounceTimer)
    if (address.length < 3) {
      suggestions = []
      showSuggestions = false
      return
    }
    debounceTimer = setTimeout(searchAddress, 500)
  }

  async function searchAddress() {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=ar&limit=5`
      const res = await fetch(url, {
        headers: { "User-Agent": "Mudar-Extension/1.0" },
      })
      suggestions = await res.json() as NominatimResult[]
      showSuggestions = suggestions.length > 0
    } catch {
      suggestions = []
      showSuggestions = false
    }
  }

  function selectSuggestion(s: NominatimResult) {
    address = s.display_name
    selectedLat = parseFloat(s.lat)
    selectedLng = parseFloat(s.lon)
    suggestions = []
    showSuggestions = false
  }

  // ── Calcular isócrona ─────────────────────────────────────────────────────
  const isFree = $derived(transport === "walking")
  const canCalculate = $derived(
    session !== null && (isFree || (tokens !== null && tokens > 0))
  )

  async function calculate() {
    let lat = selectedLat
    let lng = selectedLng

    if (lat === null || lng === null) {
      const center = getMapCenter()
      if (!center) {
        statusMsg = "No se pudo determinar la ubicación"
        status = "error"
        return
      }
      lat = center.lat
      lng = center.lng
    }

    status = "loading"
    statusMsg = "Calculando..."
    resultCount = null

    try {
      const res = await fetch("http://localhost:3001/api/orpc/geo.isochrone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lat,
          lng,
          time: timeMinutes * 60,
          transport,
        }),
      })

      if (res.status === 401) {
        status = "error"
        statusMsg = "Iniciá sesión para calcular"
        return
      }

      const data = await res.json() as { result?: GeoJSON; error?: { message: string } }

      if (data.error?.message === "NO_COVERAGE") {
        status = "error"
        statusMsg = "Sin cobertura en esta zona. No se cobró token."
        return
      }

      if (!res.ok || !data.result) {
        status = "error"
        statusMsg = "Error al calcular la isócrona"
        return
      }

      const geojson = data.result

      // Extraer anillos del polígono
      const polyRings = extractRings(geojson)

      status = "success"
      statusMsg = ""

      // Actualizar tokens
      if (!isFree) {
        tokens = (tokens ?? 1) - 1
      }

      onCalculate(geojson, polyRings)
    } catch {
      status = "error"
      statusMsg = "Error de red"
    }
  }

  function extractRings(geojson: GeoJSON): number[][][] {
    if (geojson.type === "FeatureCollection" && geojson.features.length > 0) {
      const feature = geojson.features[0]
      if (feature?.geometry.type === "Polygon") {
        return feature.geometry.coordinates
      }
      if (feature?.geometry.type === "MultiPolygon") {
        return feature.geometry.coordinates[0] ?? []
      }
    }
    if (geojson.type === "Feature") {
      if (geojson.geometry.type === "Polygon") {
        return geojson.geometry.coordinates
      }
    }
    return []
  }

  function handleClear() {
    status = "idle"
    statusMsg = ""
    resultCount = null
    onClear()
  }

  // Expuesto para que index.ts actualice el conteo
  export function setResultCount(n: number) {
    resultCount = n
  }
</script>

{#if !minimized}
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Mudar</span>
      <button class="btn-minimize" onclick={() => (minimized = true)} title="Minimizar">−</button>
    </div>

    <div class="panel-body">
      <!-- Dirección -->
      <div class="field">
        <label class="field-label" for="mudar-address">Dirección</label>
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
      </div>

      <!-- Tiempo -->
      <div class="field">
        <label class="field-label" for="mudar-time">Tiempo: {timeMinutes} min</label>
        <input
          id="mudar-time"
          class="slider"
          type="range"
          min="15"
          max="60"
          step="15"
          bind:value={timeMinutes}
        />
        <div class="slider-ticks">
          <span>15</span><span>30</span><span>45</span><span>60</span>
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
            { value: "public_transport", label: "🚌 Transporte", free: false },
          ] as opt (opt.value)}
            <button
              class="transport-btn"
              class:active={transport === opt.value}
              onclick={() => (transport = opt.value as typeof transport)}
            >
              {opt.label}
              {#if !opt.free}<span class="token-badge">−1</span>{/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Tokens -->
      <div class="tokens-row">
        {#if session}
          <span class="tokens-label">
            {tokens === null ? "—" : tokens} tokens disponibles
          </span>
        {:else}
          <a href="http://localhost:3001/sign-in" target="_blank" rel="noopener" class="link">
            Iniciá sesión para calcular
          </a>
        {/if}
      </div>

      <!-- Botones -->
      <div class="actions">
        <button
          class="btn-primary"
          disabled={!canCalculate || status === "loading"}
          onclick={calculate}
        >
          {status === "loading" ? "Calculando..." : "Calcular zona"}
        </button>
        {#if status === "success"}
          <button class="btn-secondary" onclick={handleClear}>Limpiar zona</button>
        {/if}
      </div>

      <!-- Estado / resultado -->
      {#if status === "error"}
        <p class="msg-error">{statusMsg}</p>
      {/if}
      {#if status === "success"}
        <p class="msg-success">
          {resultCount !== null ? `${resultCount} propiedades en zona` : "Zona calculada ✓"}
        </p>
      {/if}
    </div>
  </div>
{:else}
  <button class="btn-expand" onclick={() => (minimized = false)} title="Abrir panel">
    Mudar ▲
  </button>
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
  }

  .panel {
    position: fixed;
    top: 80px;
    right: 12px;
    width: 300px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    z-index: 9999;
    color: #111827;
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

  .panel-title {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.3px;
  }

  .btn-minimize {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 2px;
    opacity: 0.8;
  }

  .btn-minimize:hover {
    opacity: 1;
  }

  .panel-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .autocomplete {
    position: relative;
  }

  .input {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid #d1d5db;
    border-radius: 7px;
    font-size: 13px;
    outline: none;
    color: #111827;
    background: #f9fafb;
  }

  .input:focus {
    border-color: #1a56db;
    background: #fff;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #d1d5db;
    border-top: none;
    border-radius: 0 0 7px 7px;
    max-height: 160px;
    overflow-y: auto;
    z-index: 10000;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .suggestion-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: #374151;
    line-height: 1.4;
  }

  .suggestion-item:hover {
    background: #f3f4f6;
  }

  .slider {
    width: 100%;
    accent-color: #1a56db;
    cursor: pointer;
  }

  .slider-ticks {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #9ca3af;
    padding: 0 2px;
  }

  .transport-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .transport-btn {
    padding: 7px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    background: #f9fafb;
    cursor: pointer;
    font-size: 12px;
    color: #374151;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all 0.1s;
  }

  .transport-btn.active {
    border-color: #1a56db;
    background: #eff6ff;
    color: #1a56db;
    font-weight: 600;
  }

  .token-badge {
    font-size: 10px;
    color: #f59e0b;
    font-weight: 700;
  }

  .tokens-row {
    font-size: 12px;
    color: #6b7280;
    text-align: center;
  }

  .link {
    color: #1a56db;
    text-decoration: none;
    font-size: 12px;
  }

  .link:hover {
    text-decoration: underline;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .btn-primary {
    flex: 1;
    padding: 9px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1e40af;
  }

  .btn-primary:disabled {
    background: #93c5fd;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 9px 14px;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  .msg-error {
    font-size: 12px;
    color: #dc2626;
    text-align: center;
    margin: 0;
  }

  .msg-success {
    font-size: 12px;
    color: #16a34a;
    text-align: center;
    margin: 0;
  }

  .btn-expand {
    position: fixed;
    top: 80px;
    right: 12px;
    padding: 6px 12px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
</style>
