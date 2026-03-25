// Background service worker — proxy oRPC: message-port → fetch → Next.js server
import { RPCHandler } from "@orpc/server/message-port"
import { os } from "@orpc/server"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"
import type { AppRouter } from "@mudar/api"

const API_BASE = "http://localhost:3001/api/orpc"

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
    tokens: os.handler(() => server.user.tokens(undefined)),
    history: os.handler(() => server.user.history(undefined)),
  },
}

const handler = new RPCHandler(router)

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    handler.upgrade(port, { context: {} })
  })
  console.log("[Mudar] background script cargado ✅")
})
