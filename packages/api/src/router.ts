import { z } from "zod"
import { eq, sum } from "drizzle-orm"

import { db, tokens, calculations } from "@mudar/db"
import { TravelTimeProvider, NoCoverageError } from "@mudar/geo"
import { ORPCError } from "@orpc/server"
import { authedProcedure } from "./middleware"

const INITIAL_TOKENS = 10
const FREE_TRANSPORTS = new Set(["walking"])

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
    const isFree = FREE_TRANSPORTS.has(input.transport)

    // Verificar saldo ANTES de llamar a TravelTime (solo si no es gratis)
    if (!isFree) {
      const result = await db
        .select({ total: sum(tokens.amount) })
        .from(tokens)
        .where(eq(tokens.userId, context.user.id))

      const balance = Number(result[0]?.total ?? 0)
      if (balance < 1) {
        throw new ORPCError("FORBIDDEN", {
          message: "Sin tokens suficientes",
        })
      }
    }

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

    // Guardar en historial
    await db.insert(calculations).values({
      userId: context.user.id,
      lat: input.lat,
      lng: input.lng,
      timeSeconds: input.time,
      transport: input.transport,
      geojson,
    })

    // Descontar token solo si no es transporte gratuito
    if (!isFree) {
      await db.insert(tokens).values({
        userId: context.user.id,
        amount: -1,
      })
    }

    return geojson
  })

// ── user.tokens ───────────────────────────────────────────────────────────────
// Si el usuario nunca tuvo un registro de tokens (sum = null), se otorgan
// los tokens iniciales de forma lazy en la primera consulta.

const userTokens = authedProcedure.handler(async ({ context }) => {
  const result = await db
    .select({ total: sum(tokens.amount) })
    .from(tokens)
    .where(eq(tokens.userId, context.user.id))

  // sum() retorna null cuando no hay filas → primer acceso del usuario
  if (result[0]?.total === null) {
    await db.insert(tokens).values({
      userId: context.user.id,
      amount: INITIAL_TOKENS,
    })
    return { tokens: INITIAL_TOKENS }
  }

  return { tokens: Number(result[0]?.total ?? 0) }
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
    history: userHistory,
  },
}

export type AppRouter = typeof router
