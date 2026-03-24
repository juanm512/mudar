import { ORPCHandler } from "@orpc/server/node"
import { router } from "@mudar/api"

const handler = new ORPCHandler(router)

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: "/api",
  })

  return response ?? new Response("Not found", { status: 404 })
}

export const GET = handleRequest
export const POST = handleRequest
