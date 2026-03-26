// Webhook handler para eventos de Polar
// Docs: https://docs.polar.sh/api-reference/webhooks

import { validateEvent } from "@polar-sh/sdk/webhooks"
import { db, tokens, tokenOrders, tokenPacks, eq, and, sum } from "@mudar/db"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const rawBody = await req.text()
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET ?? ""

  let event: ReturnType<typeof validateEvent>
  try {
    event = validateEvent(
      rawBody,
      Object.fromEntries(req.headers.entries()),
      webhookSecret,
    )
  } catch (err) {
    console.error("[polar-webhook] Firma inválida:", err)
    return new Response("Firma inválida", { status: 401 })
  }

  // Solo procesamos órdenes pagadas
  if (event.type !== "order.paid") {
    return new Response("OK", { status: 200 })
  }

  const order_data = event.data
  const orderId = (order_data.metadata as Record<string, string> | null)?.orderId

  if (!orderId) {
    console.error("[polar-webhook] orderId ausente en metadata. polarOrderId:", order_data.id)
    return new Response("orderId ausente", { status: 400 })
  }

  const [order] = await db
    .select()
    .from(tokenOrders)
    .where(eq(tokenOrders.id, orderId))

  if (!order) {
    console.error("[polar-webhook] orden no encontrada:", orderId)
    return new Response("Orden no encontrada", { status: 404 })
  }

  // Actualizar solo si está en "pending" — idempotencia garantizada
  const updated = await db
    .update(tokenOrders)
    .set({ status: "completed", externalId: order_data.id, paymentProvider: "polar" })
    .where(and(eq(tokenOrders.id, orderId), eq(tokenOrders.status, "pending")))
    .returning({ id: tokenOrders.id })

  if (updated.length === 0) {
    // Ya fue procesado — idempotencia
    return new Response("OK", { status: 200 })
  }

  // Acreditar tokens
  await db.insert(tokens).values({
    userId: order.userId,
    amount: order.tokensGranted,
    reason: "purchase",
    orderId: order.id,
  })

  // Calcular nuevo saldo
  const balanceResult = await db
    .select({ total: sum(tokens.amount) })
    .from(tokens)
    .where(eq(tokens.userId, order.userId))
  const newBalance = Number(balanceResult[0]?.total ?? order.tokensGranted)

  // Nombre del pack para el email
  const [pack] = await db
    .select({ name: tokenPacks.name })
    .from(tokenPacks)
    .where(eq(tokenPacks.id, order.packId))

  // Email de compra exitosa
  const customerEmail = (order_data.customer as { email?: string } | null)?.email
  if (customerEmail && process.env.RESEND_FROM_EMAIL) {
    const priceFormatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(order.pricePaid / 100)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: customerEmail,
      subject: `✅ Compraste ${order.tokensGranted} tokens — Mudarg`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#1a56db;margin-bottom:8px;">¡Gracias por tu compra!</h2>
          <p style="color:#374151;margin-bottom:24px;">
            Tu pago fue procesado correctamente. Tus tokens ya están disponibles en tu cuenta.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Pack</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">${pack?.name ?? "Pack de tokens"}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Tokens acreditados</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;color:#16a34a;border-bottom:1px solid #e5e7eb;">+${order.tokensGranted}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Precio pagado</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">${priceFormatted}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Saldo actual</td>
              <td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">${newBalance} tokens</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6b7280;">N° de orden</td>
              <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px;color:#9ca3af;">${order.id}</td>
            </tr>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
            Si tenés alguna duda, respondé este email y te ayudamos.
          </p>
        </div>
      `,
    })
  }

  console.log(
    `[polar-webhook] orderId=${order_data.id} → ${order.tokensGranted} tokens acreditados a ${order.userId}`,
  )

  return new Response("OK", { status: 200 })
}
