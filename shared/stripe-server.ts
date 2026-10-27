import Stripe from 'stripe'
import { DEFAULT_SITE_URL, normalizeSiteUrl } from './site'

/** Bindings de Cloudflare Pages / process.env en local. */
export type StripeEnv = {
  STRIPE_SECRET_KEY?: string
  STRIPE_PRICE_ID?: string
  STRIPE_WEBHOOK_SECRET?: string
  VITE_SITE_URL?: string
}

export function envFromProcess(): StripeEnv {
  return {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    VITE_SITE_URL: process.env.VITE_SITE_URL,
  }
}

/** Stripe SDK con HTTP fetch (Cloudflare Workers / Pages Functions). */
export function getStripe(env: StripeEnv): Stripe {
  const key = env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error(
      'Falta STRIPE_SECRET_KEY. Configúrala en Cloudflare Pages → Settings → Variables.',
    )
  }
  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  })
}

export function getPriceId(env: StripeEnv): string {
  const id = env.STRIPE_PRICE_ID?.trim()
  if (!id) {
    throw new Error(
      'Falta STRIPE_PRICE_ID. Crea un precio de suscripción en Stripe y pégalo en las variables de entorno.',
    )
  }
  return id
}

export function getSiteUrl(env: StripeEnv): string {
  return normalizeSiteUrl(env.VITE_SITE_URL) || DEFAULT_SITE_URL
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

export function stripeConfigured(env: StripeEnv): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_PRICE_ID?.trim())
}

export async function emailHasActivePro(
  env: StripeEnv,
  email: string,
): Promise<{ isPro: boolean; customerId: string | null }> {
  const stripe = getStripe(env)
  const priceId = getPriceId(env)
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

/**
 * Verifica la firma del webhook de Stripe con WebCrypto (Workers).
 * Usa constructEventAsync del SDK, que no depende de Node crypto.
 */
export async function verifyStripeWebhook(
  env: StripeEnv,
  rawBody: string,
  signature: string,
): Promise<Stripe.Event> {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    throw new Error('Falta STRIPE_WEBHOOK_SECRET en las variables de entorno.')
  }
  const stripe = getStripe(env)
  return stripe.webhooks.constructEventAsync(rawBody, signature, secret)
}
