// Cliente para Polar — usa el SDK oficial @polar-sh/sdk
// https://docs.polar.sh

import { Polar } from "@polar-sh/sdk"
import { env } from "./env"

const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
})

export interface CreateCheckoutParams {
  polarProductId: string
  orderId: string
  userId: string
  userEmail?: string
}

export interface CreateCheckoutResult {
  checkoutUrl: string
  checkoutId: string
}

export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CreateCheckoutResult> {
  const { polarProductId, orderId, userId, userEmail } = params

  const checkout = await polar.checkouts.create({
    products: [polarProductId],
    externalCustomerId: userId,
    metadata: { orderId, userId },
    successUrl: `${env.APP_URL}/dashboard/tokens?payment=success`,
    ...(userEmail && { customerEmail: userEmail }),
  })

  if (!checkout.url) {
    throw new Error("Polar no devolvió una URL de checkout válida")
  }

  return {
    checkoutUrl: checkout.url,
    checkoutId: checkout.id,
  }
}
