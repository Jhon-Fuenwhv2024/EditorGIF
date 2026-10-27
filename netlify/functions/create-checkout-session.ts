import type { Config, Context } from '@netlify/functions'
import {
  corsPreflight,
  emailHasActivePro,
  getPriceId,
  getSiteUrl,
  getStripe,
  isValidEmail,
  json,
} from './_shared/stripe'

export default async (req: Request, _context?: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const body = (await req.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase() || ''
    if (!isValidEmail(email)) {
      return json({ error: 'Indica un email válido para la suscripción.' }, 400)
    }

    const existing = await emailHasActivePro(email)
    if (existing.isPro) {
      return json({ error: 'Este email ya tiene Fotogif Pro activo.' }, 400)
    }

    const stripe = getStripe()
    const priceId = getPriceId()
    const site = getSiteUrl(req)

    let customerId = existing.customerId
    if (!customerId) {
      const customer = await stripe.customers.create({ email })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/app?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { fotogif_email: email },
      subscription_data: {
        metadata: { fotogif_email: email },
      },
    })

    if (!session.url) {
      return json({ error: 'Stripe no devolvió URL de checkout.' }, 500)
    }

    return json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear el checkout'
    return json({ error: message }, 500)
  }
}

export const config: Config = {
  path: '/api/create-checkout-session',
  method: ['POST', 'OPTIONS'],
}
