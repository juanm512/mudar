<script lang="ts">
  import {
    QueryClient,
    setQueryClientContext,
    createQuery,
  } from "@tanstack/svelte-query"
  import type { CreateQueryOptions } from "@tanstack/svelte-query"
  import { writable, derived } from "svelte/store"
  import { orpc } from "@/api"

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  })
  setQueryClientContext(queryClient)

  const API_BASE = "http://localhost:3001"

  // Sesión desde better-auth (no expuesta en oRPC)
  let session = $state<{ email: string } | null>(null)
  let sessionLoading = $state(true)
  const _sessionEnabled = writable(false)

  $effect(() => {
    fetch(`${API_BASE}/api/auth/get-session`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: { email: string } } | null) => {
        session = d?.user ? { email: d.user.email } : null
        _sessionEnabled.set(session !== null)
      })
      .catch(() => { session = null; _sessionEnabled.set(false) })
      .finally(() => { sessionLoading = false })
  })

  // createQuery acepta StoreOrVal (plain object o Readable), no función
  const _tokensOpts = derived(
    _sessionEnabled,
    (enabled): CreateQueryOptions<{ tokens: number }> => ({
      ...orpc.tokens.balance.queryOptions(),
      enabled,
    })
  )
  const tokensQuery = createQuery(_tokensOpts)

  const tokenCount = $derived(
    ($tokensQuery.data as { tokens: number } | undefined)?.tokens ?? null
  )
  const tokenBarPct = $derived(
    tokenCount === null ? 0 : Math.min(tokenCount / 10, 1) * 100
  )
  const tokenBarColor = $derived(
    tokenCount === null ? "#93c5fd"
      : tokenCount === 0 ? "#dc2626"
      : tokenCount <= 3 ? "#f97316"
      : "#16a34a"
  )

  function openDashboard() {
    chrome.tabs.create({ url: `${API_BASE}/dashboard` })
  }

  function openSignIn() {
    chrome.tabs.create({ url: `${API_BASE}/sign-in` })
  }

  function openTokens() {
    chrome.tabs.create({ url: `${API_BASE}/dashboard/tokens` })
  }
</script>

<main class="popup">
  <header class="popup-header">
    <img src="/icon1.png" alt="Mudarg" class="header-logo" />
    <span class="title">Mudarg</span>
  </header>

  {#if sessionLoading}
    <div class="popup-body center">
      <img src="/icon1.png" alt="Mudarg" class="loading-logo" />
    </div>
  {:else if session}
    <div class="popup-body">
      <div class="user-info">
        <span class="email">{session.email}</span>
      </div>

      <!-- Saldo de tokens -->
      <div class="tokens">
        <span class="token-count" style="color:{tokenBarColor}">
          {$tokensQuery.isLoading ? "…" : (tokenCount ?? "—")}
        </span>
        <div class="token-meta">
          <span class="token-label">
            {#if tokenCount === 0}
              sin tokens
            {:else if tokenCount !== null && tokenCount <= 3}
              tokens — ¡casi sin saldo!
            {:else}
              tokens disponibles
            {/if}
          </span>
          <!-- Barra de progreso -->
          <div class="token-bar-bg">
            <div
              class="token-bar-fill"
              style="width:{tokenBarPct}%;background:{tokenBarColor}"
            ></div>
          </div>
        </div>
      </div>

      <!-- Pill informativo del pack Pro -->
      <div class="pack-pill">
        ⚡ 10 tokens por <strong>$16.000</strong>
      </div>

      <button class="btn-primary" onclick={openDashboard}>
        Ir al Dashboard
      </button>

      <!-- CTA de compra contextual -->
      {#if tokenCount !== null && tokenCount <= 3}
        <button class="btn-buy" onclick={openTokens}>
          ⚡ Comprar tokens
        </button>
      {:else}
        <button class="btn-link" onclick={openTokens}>
          Comprar más tokens
        </button>
      {/if}
    </div>
  {:else}
    <div class="popup-body">
      <p class="login-prompt">Iniciá sesión para usar Mudarg</p>
      <button class="btn-primary" onclick={openSignIn}>
        Iniciar sesión
      </button>
    </div>
  {/if}
</main>

<style>
  .popup {
    width: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
  }
  .popup-header {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 14px; background: #1a56db; color: #fff;
  }
  .header-logo { width: 20px; height: 20px; object-fit: contain; }
  .title { font-weight: 600; font-size: 13px; letter-spacing: 0.2px; }
  .popup-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .center { align-items: center; justify-content: center; min-height: 80px; }
  .user-info { display: flex; justify-content: space-between; align-items: center; }
  .email { font-size: 12px; color: #374151; word-break: break-all; }

  .tokens { display: flex; align-items: center; gap: 10px; }
  .token-count { font-size: 36px; font-weight: 700; line-height: 1; flex-shrink: 0; transition: color 0.3s; }
  .token-meta { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .token-label { font-size: 12px; color: #6b7280; }

  .token-bar-bg {
    height: 5px; background: #e5e7eb; border-radius: 999px; overflow: hidden;
  }
  .token-bar-fill {
    height: 100%; border-radius: 999px; transition: width 0.4s, background 0.3s;
  }

  .pack-pill {
    display: inline-block; padding: 4px 10px;
    background: #eff6ff; border: 1px solid #bfdbfe;
    border-radius: 999px; font-size: 11px; color: #1e40af;
    text-align: center;
  }

  .login-prompt { font-size: 12px; color: #6b7280; text-align: center; }

  .btn-primary {
    display: block; width: 100%; text-align: center; padding: 8px;
    background: #1a56db; color: #fff; border: none; border-radius: 6px;
    font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s;
  }
  .btn-primary:hover { background: #1e40af; }

  .btn-buy {
    display: block; width: 100%; text-align: center; padding: 8px;
    background: #f97316; color: #fff; border: none; border-radius: 6px;
    font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.15s;
  }
  .btn-buy:hover { background: #ea6c0a; }

  .btn-link {
    display: block; width: 100%; text-align: center; padding: 4px;
    background: none; border: none; color: #6b7280;
    font-size: 11px; cursor: pointer; text-decoration: underline;
  }
  .btn-link:hover { color: #1a56db; }

  /* Loading Logo */
  .loading-logo {
    width: 48px;
    height: 48px;
    object-fit: contain;
    animation: mudarg-pulse 1.4s ease-in-out infinite;
  }

  @keyframes mudarg-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.82); }
  }
</style>
