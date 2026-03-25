// Webhook handler para eventos de Rebill
// Docs: https://docs.rebill.com/guides/webhooks

import { db, tokens, tokenOrders } from "@mudar/db"
import { eq, and } from "drizzle-orm"

const REBILL_WEBHOOK_SECRET = process.env.REBILL_WEBHOOK_SECRET

async function verifySignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  if (!REBILL_WEBHOOK_SECRET) return true

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(REBILL_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  // Intentar con raw body y con JSON.stringify(parsed) — Rebill puede usar cualquiera
  const candidates = [
    rawBody,
    JSON.stringify(JSON.parse(rawBody)),
  ]

  for (const candidate of candidates) {
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(candidate))
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    if (expected.length === signature.length) {
      let diff = 0
      for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
      }
      if (diff === 0) return true
    }
  }

  return false
}

interface RebillWebhookEvent {
  webhook?: {
    id: string
    event: string
    url: string
    logId: string
  }
  data?: {
    // payment.created: el pago viene en data.payment
    payment?: {
      id: string
      status: string
      metadata?: Record<string, string>
    }
    // payment.updated: el pago viene directo en data
    id?: string
    status?: string
    metadata?: Record<string, string>
    [key: string]: unknown
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()

  let event: RebillWebhookEvent
  try {
    event = JSON.parse(rawBody) as RebillWebhookEvent
  } catch {
    return new Response("Body inválido", { status: 400 })
  }

  const signature = req.headers.get("x-rebill-signature")
  if (REBILL_WEBHOOK_SECRET && signature) {
    const valid = await verifySignature(rawBody, signature)
    if (!valid) {
      console.error("[rebill-webhook] Firma inválida")
      return new Response("Firma inválida", { status: 401 })
    }
  }

  const eventType = event.webhook?.event
  const logId = event.webhook?.logId

  // Extraer el pago según el tipo de evento
  let paymentId: string | null = null
  let paymentStatus: string | null = null
  let metadata: Record<string, string> | undefined

  if (eventType === "payment.created") {
    paymentId = event.data?.payment?.id ?? null
    paymentStatus = event.data?.payment?.status ?? null
    metadata = event.data?.payment?.metadata
  } else if (eventType === "payment.updated") {
    paymentId = event.data?.id ?? null
    paymentStatus = event.data?.status ?? null
    metadata = event.data?.metadata
  } else {
    // Otros eventos (subscription.*) — ignorar
    return new Response("OK", { status: 200 })
  }

  // Solo procesar pagos aprobados
  if (paymentStatus !== "approved") {
    return new Response("OK", { status: 200 })
  }

  const orderId = metadata?.orderId
  if (!orderId) {
    console.error("[rebill-webhook] orderId ausente en metadata. logId:", logId)
    return new Response("orderId ausente", { status: 400 })
  }

  const [order] = await db
    .select()
    .from(tokenOrders)
    .where(eq(tokenOrders.id, orderId))

  if (!order) {
    console.error("[rebill-webhook] orden no encontrada:", orderId)
    return new Response("Orden no encontrada", { status: 404 })
  }

  // Idempotencia: ignorar si ya fue procesada
  if (order.status === "completed") {
    return new Response("OK", { status: 200 })
  }

  await db
    .update(tokenOrders)
    .set({ status: "completed", externalId: paymentId, paymentProvider: "rebill" })
    .where(
      and(eq(tokenOrders.id, orderId), eq(tokenOrders.status, "pending")),
    )

  await db.insert(tokens).values({
    userId: order.userId,
    amount: order.tokensGranted,
    reason: "purchase",
    orderId: order.id,
  })

  console.log(
    `[rebill-webhook] logId=${logId} → ${order.tokensGranted} tokens acreditados a ${order.userId}`,
  )

  return new Response("OK", { status: 200 })
}
