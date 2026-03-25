import { z } from "zod"
import { eq, sum } from "drizzle-orm"

import { db, tokens, calculations, tokenPacks, tokenOrders } from "@mudar/db"
import { TravelTimeProvider, NoCoverageError } from "@mudar/geo"
import { createPaymentLink } from "@mudar/rebill"
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
      address: z.string().optional(),
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
      address: input.address,
    })

    // Descontar token solo si no es transporte gratuito
    if (!isFree) {
      await db.insert(tokens).values({
        userId: context.user.id,
        amount: -1,
        reason: "isochrone",
      })
    }

    return geojson
  })

// ── tokens.balance ────────────────────────────────────────────────────────────
// Si el usuario nunca tuvo un registro de tokens (sum = null), se otorgan
// los tokens iniciales de forma lazy en la primera consulta.

const tokensBalance = authedProcedure.handler(async ({ context }) => {
  const result = await db
    .select({ total: sum(tokens.amount) })
    .from(tokens)
    .where(eq(tokens.userId, context.user.id))

  // sum() retorna null cuando no hay filas → primer acceso del usuario
  if (result[0]?.total === null) {
    await db.insert(tokens).values({
      userId: context.user.id,
      amount: INITIAL_TOKENS,
      reason: "initial_grant",
    })
    return { tokens: INITIAL_TOKENS }
  }

  return { tokens: Number(result[0]?.total ?? 0) }
})

// ── tokens.packs ──────────────────────────────────────────────────────────────

const tokensPacks = authedProcedure.handler(async () => {
  const packs = await db
    .select()
    .from(tokenPacks)
    .where(eq(tokenPacks.active, true))
    .orderBy(tokenPacks.priceArs)
  return { packs }
})

// ── tokens.purchase ───────────────────────────────────────────────────────────

const tokensPurchase = authedProcedure
  .input(z.object({ packId: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const pack = await db
      .select()
      .from(tokenPacks)
      .where(eq(tokenPacks.id, input.packId))
      .then((r) => r[0])

    if (!pack || !pack.active) {
      throw new ORPCError("NOT_FOUND", { message: "Pack no encontrado" })
    }

    // Crear orden en estado "pending" — se completará vía webhook de Rebill
    const [order] = await db
      .insert(tokenOrders)
      .values({
        userId: context.user.id,
        packId: pack.id,
        tokensGranted: pack.tokens,
        pricePaid: pack.priceArs,
        status: "pending",
        paymentProvider: "rebill",
      })
      .returning()

    // Generar Payment Link de un solo uso en Rebill
    const { checkoutUrl } = await createPaymentLink({
      orderId: order!.id,
      userId: context.user.id,
      packName: pack.name,
      priceArsCents: pack.priceArs,
      tokens: pack.tokens,
      userEmail: context.user.email,
    })

    return { checkoutUrl, orderId: order!.id, newBalancePlus: pack.tokens }
  })

// ── tokens.history ────────────────────────────────────────────────────────────

const tokensHistory = authedProcedure.handler(async ({ context }) => {
  const rows = await db
    .select()
    .from(tokens)
    .where(eq(tokens.userId, context.user.id))
    .orderBy(tokens.createdAt)
  return { transactions: rows }
})

// ── user.history ──────────────────────────────────────────────────────────────

const userHistory = authedProcedure.handler(async ({ context }) => {
  const rows = await db
    .select({
      id: calculations.id,
      userId: calculations.userId,
      lat: calculations.lat,
      lng: calculations.lng,
      timeSeconds: calculations.timeSeconds,
      transport: calculations.transport,
      address: calculations.address,
      createdAt: calculations.createdAt,
    })
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
    history: userHistory,
  },
  tokens: {
    balance: tokensBalance,
    packs: tokensPacks,
    purchase: tokensPurchase,
    history: tokensHistory,
  },
}

export type AppRouter = typeof router
