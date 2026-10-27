import { handleStripeWebhook } from '../../shared/api-handlers'
import type { StripeEnv } from '../../shared/stripe-server'

/**
 * Webhook Stripe. Firma verificada con WebCrypto vía
 * stripe.webhooks.constructEventAsync (compatible con Workers).
 */
export const onRequest: PagesFunction<StripeEnv> = async (context) => {
  return handleStripeWebhook(context.request, context.env)
}
