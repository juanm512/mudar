// Cliente para la API de Rebill — Payment Links
// https://docs.rebill.com

import { env } from "./env"

const REBILL_BASE = "https://api.rebill.com/v3"

export interface CreatePaymentLinkParams {
  orderId: string
  userId: string
  packName: string
  /** Precio en centavos ARS (ej: 99900 = $999.00) */
  priceArsCents: number
  /** Tokens que otorga el pack (solo informativo para el título) */
  tokens: number
  /** Email del usuario para pre-completar el checkout */
  userEmail?: string
}

export interface CreatePaymentLinkResult {
  checkoutUrl: string
  paymentLinkId: string
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams,
): Promise<CreatePaymentLinkResult> {
  const { orderId, userId, packName, priceArsCents, tokens, userEmail } = params

  const appUrl = env.APP_URL
  const priceInArs = priceArsCents / 100

  const body = {
    type: "instant",
    title: [
      { text: `Mudar — ${packName} (${tokens} tokens)`, language: "es" },
      { text: `Mudar — ${packName} (${tokens} tokens)`, language: "en" },
    ],
    prices: [
      { amount: priceInArs, currency: "ARS" },
    ],
    paymentMethods: [
      { methods: ["card", "bank_transfer"], currency: "ARS" },
    ],
    redirectUrls: {
      approved: `${appUrl}/dashboard/tokens?payment=success`,
      rejected: `${appUrl}/dashboard/tokens?payment=cancelled`,
      pending: `${appUrl}/dashboard/tokens?payment=pending`,
    },
    isSingleUse: true,
    metadata: {
      orderId,
      userId,
    },
    ...(userEmail && {
      prefilledFields: {
        customer: { email: userEmail },
      },
    }),
  }

  const response = await fetch(`${REBILL_BASE}/payment-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.REBILL_SECRET_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Rebill API error: ${response.status} ${response.statusText} — ${text}`,
    )
  }

  const data = (await response.json()) as {
    id: string
    url: string
  }

  if (!data.url) {
    throw new Error("Rebill no devolvió una URL de checkout válida")
  }

  return {
    checkoutUrl: data.url,
    paymentLinkId: data.id,
  }
}
