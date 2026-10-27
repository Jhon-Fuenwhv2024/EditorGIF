import type { Config, Context } from '@netlify/functions'
import {
  corsPreflight,
  emailHasActivePro,
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
      return json({ error: 'Indica el email de tu suscripción.' }, 400)
    }

    const { customerId, isPro } = await emailHasActivePro(email)
    if (!customerId) {
      return json(
        { error: 'No encontramos un cliente de Stripe con ese email.' },
        404,
      )
    }
    if (!isPro) {
      return json(
        {
          error:
            'No hay una suscripción Pro activa para ese email. Si acabas de pagar, espera un momento y restaura de nuevo.',
        },
        400,
      )
    }

    const stripe = getStripe()
    const site = getSiteUrl(req)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${site}/app`,
    })

    return json({ url: session.url })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al abrir el portal de cliente'
    return json({ error: message }, 500)
  }
}

export const config: Config = {
  path: '/api/create-portal-session',
  method: ['POST', 'OPTIONS'],
}
