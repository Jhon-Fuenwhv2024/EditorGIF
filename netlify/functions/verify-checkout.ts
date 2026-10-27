import type { Config, Context } from '@netlify/functions'
import {
  corsPreflight,
  emailHasActivePro,
  getStripe,
  json,
} from './_shared/stripe'

export default async (req: Request, _context?: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const body = (await req.json()) as { session_id?: string }
    const sessionId = body.session_id?.trim() || ''
    if (!sessionId.startsWith('cs_')) {
      return json({ error: 'session_id inválido' }, 400)
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.mode !== 'subscription') {
      return json({ error: 'La sesión no es de suscripción.' }, 400)
    }

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return json({
        error: 'El pago aún no está completo.',
        isPro: false,
        email: null,
      }, 400)
    }

    const email =
      session.metadata?.fotogif_email ||
      session.customer_details?.email ||
      session.customer_email ||
      null

    if (!email) {
      return json({ error: 'No se pudo obtener el email de la sesión.' }, 400)
    }

    const normalized = email.trim().toLowerCase()
    // Confirma contra suscripciones reales (fuente de verdad = Stripe).
    const { isPro } = await emailHasActivePro(normalized)

    return json({
      email: normalized,
      isPro: isPro || session.status === 'complete',
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al verificar el checkout'
    return json({ error: message }, 500)
  }
}

export const config: Config = {
  path: '/api/verify-checkout',
  method: ['POST', 'OPTIONS'],
}
