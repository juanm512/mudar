// Background service worker — proxy oRPC: message-port → fetch → Next.js server
import { RPCHandler } from "@orpc/server/message-port"
import { os } from "@orpc/server"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"
import type { AppRouter } from "@mudar/api"

const API_BASE = `${import.meta.env.WXT_API_BASE}/api/orpc`

// Cliente fetch hacia el servidor — el background puede usar credentials sin restricciones CORS del content script
const fetchLink = new RPCLink({
  url: API_BASE,
  fetch: (url, init) => fetch(url, { ...init, credentials: "include" }),
})

const server = createORPCClient(fetchLink) as RouterClient<AppRouter>

// Router local que proxea al servidor (el server valida el input)
const router = {
  geo: {
    isochrone: os.handler(({ input }) =>
      server.geo.isochrone(
        input as Parameters<RouterClient<AppRouter>["geo"]["isochrone"]>[0]
      )
    ),
  },
  user: {
    history: os.handler(() => server.user.history(undefined)),
  },
  tokens: {
    balance: os.handler(() => server.tokens.balance(undefined)),
    packs: os.handler(() => server.tokens.packs(undefined)),
    purchase: os.handler(({ input }) =>
      server.tokens.purchase(
        input as Parameters<RouterClient<AppRouter>["tokens"]["purchase"]>[0]
      )
    ),
    history: os.handler(() => server.tokens.history(undefined)),
  },
}

const handler = new RPCHandler(router)

// ── GA4 Measurement Protocol ───────────────────────────────────────────────
const GA_MEASUREMENT_ID = import.meta.env.WXT_GA_MEASUREMENT_ID as string | undefined
const GA_API_SECRET = import.meta.env.WXT_GA_API_SECRET as string | undefined

async function getClientId(): Promise<string> {
  const stored = await browser.storage.local.get("gaClientId")
  if (stored.gaClientId) return stored.gaClientId as string
  const id = crypto.randomUUID()
  await browser.storage.local.set({ gaClientId: id })
  return id
}

export async function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): Promise<void> {
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) return
  const clientId = await getClientId()
  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
    {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, events: [{ name, params: params ?? {} }] }),
    },
  ).catch(() => { /* silencioso */ })
}

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    handler.upgrade(port, { context: {} })
  })

  browser.runtime.onMessage.addListener((msg: unknown) => {
    const m = msg as { type?: string; name?: string; params?: Record<string, unknown> }
    if (m?.type === "track") {
      void trackEvent(m.name ?? "event", m.params)
    }
  })
  // console.log("[Mudar] background script cargado ✅")
})
