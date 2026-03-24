import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"

import type { AppRouter } from "@mudar/api"

const link = new RPCLink({
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/orpc`
      : "http://localhost:3001/api/orpc",
})

export const orpc: RouterClient<AppRouter> = createORPCClient(link)
