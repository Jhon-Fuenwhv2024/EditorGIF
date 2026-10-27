import {
  downloadRemoteVideo,
  MAX_BYTES,
  resolveSourceUrl,
} from './remote-download'
import {
  corsPreflight,
  emailHasActivePro,
  getPriceId,
  getSiteUrl,
  getStripe,
  isValidEmail,
  json,
  stripeConfigured,
  type StripeEnv,
  verifyStripeWebhook,
} from './stripe-server'

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-()\s\u00C0-\u024F]+/g, '_').slice(0, 120)
}

export async function handleFetchVideo(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405)
  }

  try {
    let rawUrl = ''
    let maxBytes = MAX_BYTES
    if (req.method === 'GET') {
      const u = new URL(req.url)
      rawUrl = u.searchParams.get('url') || ''
      const mb = Number(u.searchParams.get('maxBytes'))
      if (Number.isFinite(mb) && mb > 0) maxBytes = mb
    } else {
      const body = (await req.json().catch(() => null)) as {
        url?: string
        maxBytes?: number
      } | null
      rawUrl = body?.url?.trim() || ''
      if (typeof body?.maxBytes === 'number' && body.maxBytes > 0) {
        maxBytes = body.maxBytes
      }
    }

    if (!rawUrl) return json({ error: 'Falta el parámetro url' }, 400)

    resolveSourceUrl(rawUrl)
    const file = await downloadRemoteVideo(rawUrl, maxBytes)
    return new Response(new Blob([file.bytes]), {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${sanitizeFilename(file.filename)}"`,
        'Cache-Control': 'no-store',
        'X-Fotogif-Filename': encodeURIComponent(file.filename),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al descargar el video'
    return json({ error: message }, 400)
  }
}

export async function handleCreateCheckout(
  req: Request,
  env: StripeEnv,
): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const body = (await req.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase() || ''
    if (!isValidEmail(email)) {
      return json({ error: 'Indica un email válido para la suscripción.' }, 400)
    }

    const existing = await emailHasActivePro(env, email)
    if (existing.isPro) {
      return json({ error: 'Este email ya tiene Fotogif Pro activo.' }, 400)
    }

    const stripe = getStripe(env)
    const priceId = getPriceId(env)
    const site = getSiteUrl(env)

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

export async function handleCreatePortal(
  req: Request,
  env: StripeEnv,
): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const body = (await req.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase() || ''
    if (!isValidEmail(email)) {
      return json({ error: 'Indica el email de tu suscripción.' }, 400)
    }

    const { customerId, isPro } = await emailHasActivePro(env, email)
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

    const stripe = getStripe(env)
    const site = getSiteUrl(env)
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

export async function handleProStatus(
  req: Request,
  env: StripeEnv,
): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Método no permitido' }, 405)
  }

  try {
    let email = ''
    if (req.method === 'GET') {
      email =
        new URL(req.url).searchParams.get('email')?.trim().toLowerCase() || ''
    } else {
      const body = (await req.json()) as { email?: string }
      email = body.email?.trim().toLowerCase() || ''
    }

    if (!isValidEmail(email)) {
      return json({ error: 'Email no válido', isPro: false }, 400)
    }

    if (!stripeConfigured(env)) {
      return json({
        isPro: false,
        configured: false,
        message: 'Stripe no está configurado en este entorno.',
      })
    }

    const { isPro } = await emailHasActivePro(env, email)
    return json({ isPro, configured: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar Pro'
    return json({ error: message, isPro: false }, 500)
  }
}

export async function handleVerifyCheckout(
  req: Request,
  env: StripeEnv,
): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const body = (await req.json()) as { session_id?: string }
    const sessionId = body.session_id?.trim() || ''
    if (!sessionId.startsWith('cs_')) {
      return json({ error: 'session_id inválido' }, 400)
    }

    const stripe = getStripe(env)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.mode !== 'subscription') {
      return json({ error: 'La sesión no es de suscripción.' }, 400)
    }

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return json(
        {
          error: 'El pago aún no está completo.',
          isPro: false,
          email: null,
        },
        400,
      )
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
    const { isPro } = await emailHasActivePro(env, normalized)

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

export async function handleStripeWebhook(
  req: Request,
  env: StripeEnv,
): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return json({ error: 'Falta cabecera stripe-signature' }, 400)
    }

    const rawBody = await req.text()
    const event = await verifyStripeWebhook(env, rawBody, signature)

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
