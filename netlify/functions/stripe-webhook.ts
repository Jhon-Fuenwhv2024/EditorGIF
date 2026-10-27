import type { Config, Context } from '@netlify/functions'
import { getStripe, json } from './_shared/stripe'

/**
 * Webhook opcional pero recomendado: confirma eventos de suscripción.
 * La app no depende de una base de datos; el estado Pro se consulta a Stripe
 * con el email. Este endpoint sirve para auditoría y para cumplir buenas
 * prácticas de Stripe (firma con STRIPE_WEBHOOK_SECRET).
 */
export default async (req: Request, _context?: Context) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return json(
      { error: 'Falta STRIPE_WEBHOOK_SECRET en las variables de entorno.' },
      500,
    )
  }

  try {
    const stripe = getStripe()
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return json({ error: 'Falta cabecera stripe-signature' }, 400)
    }

    const rawBody = await req.text()
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret)

    // Eventos relevantes; no persistimos nada: Stripe sigue siendo la fuente de verdad.
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        console.log(`[stripe-webhook] ${event.type}`)
        break
      default:
        console.log(`[stripe-webhook] ignorado: ${event.type}`)
    }

    return json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook inválido'
    console.error('[stripe-webhook]', message)
    return json({ error: message }, 400)
  }
}

export const config: Config = {
  path: '/api/stripe-webhook',
  method: ['POST'],
}
