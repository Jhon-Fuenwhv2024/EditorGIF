import { handleCreatePortal } from '../../shared/api-handlers'
import type { StripeEnv } from '../../shared/stripe-server'

export const onRequest: PagesFunction<StripeEnv> = async (context) => {
  return handleCreatePortal(context.request, context.env)
}
