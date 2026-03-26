// Cliente oRPC para la extensión — usa message-port para comunicarse con el background
// Reconecta automáticamente cuando el service worker MV3 se termina y el port queda inválido.
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/message-port"
import { createORPCSvelteQueryUtils } from "@orpc/svelte-query"
import type { RouterClient } from "@orpc/server"
import type { AppRouter } from "@mudar/api"

type Api = RouterClient<AppRouter>
type Orpc = ReturnType<typeof createORPCSvelteQueryUtils<Api>>

let _api: Api | null = null
let _orpc: Orpc | null = null

function connect() {
  const port = browser.runtime.connect()
  const link = new RPCLink({ port })
  _api = createORPCClient(link) as Api
  _orpc = createORPCSvelteQueryUtils(_api)
  port.onDisconnect.addListener(() => {
    _api = null
    _orpc = null
  })
}

connect()

function ensureConnected() {
  if (!_api) connect()
}

export const api = new Proxy({} as Api, {
  get(_, prop: string) {
    ensureConnected()
    return (_api as Record<string, unknown>)[prop]
  },
})

export const orpc = new Proxy({} as Orpc, {
  get(_, prop: string) {
    ensureConnected()
    return (_orpc as Record<string, unknown>)[prop]
  },
})
