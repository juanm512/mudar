import { z } from "zod"
import { eq, sum } from "drizzle-orm"

import { db, tokens, calculations } from "@mudar/db"
import { TravelTimeProvider, NoCoverageError } from "@mudar/geo"
import { authedProcedure } from "./middleware"

// ── geo.isochrone ─────────────────────────────────────────────────────────────

const geoIsochrone = authedProcedure
  .input(
    z.object({
      lat: z.number(),
      lng: z.number(),
      time: z.number().int().positive().describe("Tiempo de viaje en segundos"),
      transport: z.enum(["driving", "public_transport", "walking", "cycling"]),
    })
  )
  .handler(async ({ input, context }) => {
    const provider = new TravelTimeProvider()

    let geojson
    try {
      geojson = await provider.isochrone({
        lat: input.lat,
        lng: input.lng,
        timeSeconds: input.time,
        transport: input.transport,
      })
    } catch (err) {
      if (err instanceof NoCoverageError) {
        // Zona sin cobertura — no descontar token
        throw new Error("NO_COVERAGE")
      }
      throw err
    }

    // Guardar en historial y descontar token
    await db.insert(calculations).values({
      userId: context.user.id,
      lat: input.lat,
      lng: input.lng,
      timeSeconds: input.time,
      transport: input.transport,
      geojson,
    })

    await db.insert(tokens).values({
      userId: context.user.id,
      amount: -1,
    })

    return geojson
  })

// ── user.tokens ───────────────────────────────────────────────────────────────

const userTokens = authedProcedure.handler(async ({ context }) => {
  const result = await db
    .select({ total: sum(tokens.amount) })
    .from(tokens)
    .where(eq(tokens.userId, context.user.id))

  return { tokens: Number(result[0]?.total ?? 0) }
})

// ── user.deductToken ──────────────────────────────────────────────────────────

const userDeductToken = authedProcedure.handler(async ({ context }) => {
  await db.insert(tokens).values({
    userId: context.user.id,
    amount: -1,
  })

  return { success: true }
})

// ── user.history ──────────────────────────────────────────────────────────────

const userHistory = authedProcedure.handler(async ({ context }) => {
  const rows = await db
    .select()
    .from(calculations)
    .where(eq(calculations.userId, context.user.id))
    .orderBy(calculations.createdAt)

  return { calculations: rows }
})

// ── Router ────────────────────────────────────────────────────────────────────

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
