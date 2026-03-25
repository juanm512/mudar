// Webhook handler para eventos de Rebill
// Rebill envía un POST con firma HMAC SHA256 en el header x-rebill-signature

import { db, tokens, tokenOrders } from "@mudar/db"
import { eq, and } from "drizzle-orm"

const REBILL_WEBHOOK_SECRET = process.env.REBILL_WEBHOOK_SECRET

async function verifySignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  if (!REBILL_WEBHOOK_SECRET) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(REBILL_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  // Comparación en tiempo constante para evitar timing attacks
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

interface RebillWebhookEvent {
  type: string
  data?: {
    payment_id?: string
    id?: string
    metadata?: Record<string, string>
    [key: string]: unknown
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-rebill-signature") ?? ""

  // Validar firma solo si el secreto está configurado
  if (REBILL_WEBHOOK_SECRET) {
    const valid = await verifySignature(rawBody, signature)
    if (!valid) {
      return new Response("Firma inválida", { status: 401 })
    }
  }

  let event: RebillWebhookEvent
  try {
    event = JSON.parse(rawBody) as RebillWebhookEvent
  } catch {
    return new Response("Body inválido", { status: 400 })
  }

  // Solo procesar pagos aprobados
  if (event.type !== "payment.approved") {
    return new Response("OK", { status: 200 })
  }

  const orderId = event.data?.metadata?.orderId
  const externalId = event.data?.payment_id ?? event.data?.id ?? null

  if (!orderId) {
    console.error("[rebill-webhook] orderId ausente en metadata:", event)
    return new Response("orderId ausente", { status: 400 })
  }

  // Buscar la orden
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

  // Marcar la orden como completada
  await db
    .update(tokenOrders)
    .set({
      status: "completed",
      externalId: externalId,
      paymentProvider: "rebill",
    })
    .where(
      and(eq(tokenOrders.id, orderId), eq(tokenOrders.status, "pending")),
    )

  // Acreditar tokens al usuario
  await db.insert(tokens).values({
    userId: order.userId,
    amount: order.tokensGranted,
    reason: "purchase",
    orderId: order.id,
  })

  console.log(
    `[rebill-webhook] Pago aprobado: orden ${orderId}, ${order.tokensGranted} tokens acreditados a ${order.userId}`,
  )

  return new Response("OK", { status: 200 })
}
