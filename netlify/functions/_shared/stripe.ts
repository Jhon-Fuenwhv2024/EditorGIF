import Stripe from 'stripe'
import { DEFAULT_SITE_URL, normalizeSiteUrl } from '../../../shared/site'

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error(
      'Falta STRIPE_SECRET_KEY. Configúrala en Netlify o en tu .env local.',
    )
  }
  // Usa la versión empaquetada del SDK; no inventamos un apiVersion a mano.
  return new Stripe(key)
}

export function getPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID?.trim()
  if (!id) {
    throw new Error(
      'Falta STRIPE_PRICE_ID. Crea un precio de suscripción en Stripe y pégalo en las variables de entorno.',
    )
  }
  return id
}

/** URL de retorno Stripe / links absolutos. Prioriza env; cae a videogif.trainfit.cloud. */
export function getSiteUrl(_req?: Request): string {
  const fromEnv =
    process.env.VITE_SITE_URL?.trim() ||
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim()
  if (fromEnv) return normalizeSiteUrl(fromEnv)
  return DEFAULT_SITE_URL
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  })
}

export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  })
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Busca si el email tiene una suscripción activa o en trial al Price ID configurado. */
export async function emailHasActivePro(email: string): Promise<{
  isPro: boolean
  customerId: string | null
}> {
  const stripe = getStripe()
  const priceId = getPriceId()
  const normalized = email.trim().toLowerCase()

  const customers = await stripe.customers.list({
    email: normalized,
    limit: 10,
  })

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 20,
    })
    const active = subs.data.some(
      (s) =>
        (s.status === 'active' || s.status === 'trialing') &&
        s.items.data.some((item) => item.price.id === priceId),
    )
    if (active) {
      return { isPro: true, customerId: customer.id }
    }
  }

  return { isPro: false, customerId: customers.data[0]?.id ?? null }
}
