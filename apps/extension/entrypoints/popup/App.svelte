<!-- Popup de Mudar — login/cuenta/tokens -->
<script lang="ts">
  // Estado reactivo con runes de Svelte 5
  let userEmail = $state<string | null>(null)
  let tokenCount = $state(0)
  let isLoggedIn = $state(false)

  // Cargar sesión desde localStorage al montar
  $effect(() => {
    const stored = localStorage.getItem("mudar_session")
    if (stored) {
      try {
        const session = JSON.parse(stored) as { email: string; tokens: number }
        userEmail = session.email
        tokenCount = session.tokens
        isLoggedIn = true
      } catch {
        // Sesión corrupta, ignorar
      }
    }
  })

  function handleLogout() {
    localStorage.removeItem("mudar_session")
    userEmail = null
    tokenCount = 0
    isLoggedIn = false
  }
</script>

<main class="popup">
  <header class="popup-header">
    <span class="dot"></span>
    <span class="title">Mudar</span>
  </header>

  {#if isLoggedIn}
    <div class="popup-body">
      <div class="user-info">
        <span class="email">{userEmail}</span>
        <button class="btn-link" onclick={handleLogout}>Cerrar sesión</button>
      </div>
      <div class="tokens">
        <span class="token-count">{tokenCount}</span>
        <span class="token-label">tokens disponibles</span>
      </div>
    </div>
  {:else}
    <div class="popup-body">
      <p class="login-prompt">
        Iniciá sesión para usar isócronas
      </p>
      <a
        href="http://localhost:3000/sign-in"
        target="_blank"
        rel="noopener"
        class="btn-primary"
      >
        Iniciar sesión
      </a>
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

  .user-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .email {
    font-size: 12px;
    color: #374151;
  }

  .btn-link {
    background: none;
    border: none;
    color: #1a56db;
    cursor: pointer;
    font-size: 11px;
    padding: 0;
  }

  .btn-link:hover {
    text-decoration: underline;
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
    text-align: center;
    padding: 8px;
    background: #1a56db;
    color: #fff;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
  }

  .btn-primary:hover {
    background: #1e40af;
  }
</style>
