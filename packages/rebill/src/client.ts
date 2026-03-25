// Cliente para la API de Rebill — Payment Links
// https://docs.rebill.com

import { env } from "./env"

const REBILL_BASE = "https://api.rebill.com/v2"

export interface CreatePaymentLinkParams {
  orderId: string
  userId: string
  packName: string
  /** Precio en centavos ARS (ej: 99900 = $999.00) */
  priceArsCents: number
  /** Tokens que otorga el pack (solo informativo para el título) */
  tokens: number
}

export interface CreatePaymentLinkResult {
  checkoutUrl: string
  paymentLinkId: string
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams,
): Promise<CreatePaymentLinkResult> {
  const { orderId, userId, packName, priceArsCents, tokens } = params

  const appUrl = env.NEXT_PUBLIC_APP_URL
  const priceInArs = priceArsCents / 100

  const body = {
    title: `Mudar — ${packName} (${tokens} tokens)`,
    currency: "ARS",
    price: priceInArs,
    metadata: {
      orderId,
      userId,
    },
    redirect_url: `${appUrl}/dashboard/tokens?payment=success`,
    cancel_url: `${appUrl}/dashboard/tokens?payment=cancelled`,
    organization_id: env.REBILL_ORGANIZATION_ID,
  }

  const response = await fetch(`${REBILL_BASE}/payment-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.REBILL_API_KEY}`,
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
    checkout_url?: string
  }

  const checkoutUrl = data.checkout_url ?? data.url

  if (!checkoutUrl) {
    throw new Error("Rebill no devolvió una URL de checkout válida")
  }

  return {
    checkoutUrl,
    paymentLinkId: data.id,
  }
}
