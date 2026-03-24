<script lang="ts">
  let userEmail = $state<string | null>(null)
  let tokenCount = $state<number | null>(null)
  let isLoggedIn = $state(false)
  let loading = $state(true)

  const API_BASE = "http://localhost:3001"

  $effect(() => {
    loadSession()
  })

  async function loadSession() {
    loading = true
    try {
      const sessRes = await fetch(`${API_BASE}/api/auth/get-session`, {
        credentials: "include",
      })
      if (!sessRes.ok) {
        isLoggedIn = false
        return
      }
      const sessData = await sessRes.json() as { user?: { email: string } } | null
      if (!sessData?.user) {
        isLoggedIn = false
        return
      }
      userEmail = sessData.user.email
      isLoggedIn = true

      const tokRes = await fetch(`${API_BASE}/api/orpc/user.tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      if (tokRes.ok) {
        const tokData = await tokRes.json() as { result?: { tokens: number } }
        tokenCount = tokData.result?.tokens ?? 0
      }
    } catch {
      isLoggedIn = false
    } finally {
      loading = false
    }
  }

  function openDashboard() {
    chrome.tabs.create({ url: `${API_BASE}/dashboard` })
  }

  function openSignIn() {
    chrome.tabs.create({ url: `${API_BASE}/sign-in` })
  }
</script>

<main class="popup">
  <header class="popup-header">
    <span class="dot"></span>
    <span class="title">Mudar</span>
  </header>

  {#if loading}
    <div class="popup-body center">
      <p class="muted">Cargando...</p>
    </div>
  {:else if isLoggedIn}
    <div class="popup-body">
      <div class="user-info">
        <span class="email">{userEmail}</span>
      </div>
      <div class="tokens">
        <span class="token-count">{tokenCount ?? "—"}</span>
        <span class="token-label">tokens disponibles</span>
      </div>
      <button class="btn-primary" onclick={openDashboard}>
        Ir al Dashboard
      </button>
    </div>
  {:else}
    <div class="popup-body">
      <p class="login-prompt">Iniciá sesión para usar isócronas</p>
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
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    background: #1a56db;
    color: #fff;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #7dd3fc;
  }

  .title {
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.2px;
  }

  .popup-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .center {
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .muted {
    font-size: 12px;
    color: #9ca3af;
  }

  .user-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .email {
    font-size: 12px;
    color: #374151;
    word-break: break-all;
  }

  .tokens {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .token-count {
    font-size: 28px;
    font-weight: 700;
    color: #1a56db;
    line-height: 1;
  }

  .token-label {
    font-size: 12px;
    color: #6b7280;
  }

  .login-prompt {
    font-size: 12px;
    color: #6b7280;
    text-align: center;
  }

  .btn-primary {
    display: block;
    width: 100%;
    text-align: center;
    padding: 8px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-primary:hover {
    background: #1e40af;
  }
</style>
