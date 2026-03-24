import { os } from "@orpc/server"
import { z } from "zod"

// ── Procedimientos de geo ────────────────────────────────────────────────────

const geoIsochrone = os
  .input(
    z.object({
      lat: z.number(),
      lng: z.number(),
      time: z.number().int().positive().describe("Tiempo de viaje en segundos"),
      transport: z.enum(["driving", "public_transport", "walking", "cycling"]),
    })
  )
  .handler(async ({ input }) => {
    // TODO: integrar con @mudar/geo TravelTimeProvider
    // Placeholder que retorna un GeoJSON vacío
    return {
      type: "FeatureCollection" as const,
      features: [],
      _params: input,
    }
  })

// ── Procedimientos de usuario ────────────────────────────────────────────────

const userTokens = os.handler(async () => {
  // TODO: consultar tokens desde @mudar/db
  return { tokens: 10 }
})

const userDeductToken = os.handler(async () => {
  // TODO: descontar token en @mudar/db
  return { success: true }
})

const userHistory = os.handler(async () => {
  // TODO: consultar historial desde @mudar/db
  return { calculations: [] as Array<{
    id: string
    lat: number
    lng: number
    timeSeconds: number
    transport: string
    createdAt: string
  }> }
})

// ── Router ───────────────────────────────────────────────────────────────────

export const router = {
  geo: {
    isochrone: geoIsochrone,
  },
  user: {
    tokens: userTokens,
    deductToken: userDeductToken,
    history: userHistory,
  },
}

export type AppRouter = typeof router
