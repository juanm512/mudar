// Cliente oRPC para la extensión — usa message-port para comunicarse con el background
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/message-port"
import { createORPCSvelteQueryUtils } from "@orpc/svelte-query"
import type { RouterClient } from "@orpc/server"
import type { AppRouter } from "@mudar/api"

const link = new RPCLink({ port: browser.runtime.connect() })

export const api: RouterClient<AppRouter> = createORPCClient(link)
export const orpc = createORPCSvelteQueryUtils(api)
