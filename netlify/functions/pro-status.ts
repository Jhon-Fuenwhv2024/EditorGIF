import type { Config, Context } from '@netlify/functions'
import {
  corsPreflight,
  emailHasActivePro,
  isValidEmail,
  json,
} from './_shared/stripe'

export default async (req: Request, _context?: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Método no permitido' }, 405)
  }

  try {
    let email = ''
    if (req.method === 'GET') {
      email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase() || ''
    } else {
      const body = (await req.json()) as { email?: string }
      email = body.email?.trim().toLowerCase() || ''
    }

    if (!isValidEmail(email)) {
      return json({ error: 'Email no válido', isPro: false }, 400)
    }

    // Sin claves Stripe: la app gratis sigue funcionando; Pro = false.
    if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.STRIPE_PRICE_ID?.trim()) {
      return json({
        isPro: false,
        configured: false,
        message: 'Stripe no está configurado en este entorno.',
      })
    }

    const { isPro } = await emailHasActivePro(email)
    return json({ isPro, configured: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar Pro'
    return json({ error: message, isPro: false }, 500)
  }
}

export const config: Config = {
  path: '/api/pro-status',
  method: ['GET', 'POST', 'OPTIONS'],
}
