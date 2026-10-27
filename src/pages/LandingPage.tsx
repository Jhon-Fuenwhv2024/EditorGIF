import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { freeMaxMb, proMaxMb, proPriceLabel } from '../lib/env'

const faqs = [
  {
    q: '¿Mis videos se suben a un servidor?',
    a: 'La conversión a GIF ocurre en tu navegador con FFmpeg.wasm. Si importas por enlace, un endpoint descarga el archivo temporalmente para saltar CORS (p. ej. Google Drive) y luego el procesamiento sigue siendo local.',
  },
  {
    q: '¿Qué formatos admite?',
    a: 'MP4, WebM y MOV, por archivo o por enlace (URL directa, Google Drive público o Dropbox).',
  },
  {
    q: '¿Qué incluye Fotogif Pro?',
    a: `Sin anuncios, sin marca de agua «hecho con Fotogif», y hasta ~${proMaxMb()} MB al importar por enlace (el plan gratis permite ~${freeMaxMb()} MB). La suscripción se gestiona con Stripe.`,
  },
  {
    q: '¿Puedo cancelar Pro?',
    a: 'Sí. Usa «Gestionar / cancelar» en el editor: abre el portal de cliente de Stripe con el mismo email del pago.',
  },
  {
    q: '¿Funciona en el móvil?',
    a: 'Sí. La interfaz es responsive y puedes instalar Fotogif como PWA desde el navegador cuando esté disponible.',
  },
]

export function LandingPage() {
  const priceHint = proPriceLabel()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <SiteHeader />

      <main className="flex flex-1 flex-col gap-16">
        <section className="animate-rise relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white/55 px-6 py-12 shadow-[var(--shadow)] sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--lime)]/35 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[var(--coral)]/20 blur-3xl"
            aria-hidden
          />
          <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-[var(--coral)]">
            Video → GIF, en tu dispositivo
          </p>
          <h1 className="font-display relative mt-3 max-w-2xl text-4xl leading-[1.05] text-[var(--ink)] sm:text-5xl md:text-6xl">
            Fotogif
          </h1>
          <p className="relative mt-4 max-w-xl text-lg text-[var(--ink)]/75 sm:text-xl">
            Recorta, ajusta FPS y descarga GIFs con calidad de paleta. Sin cuenta
            obligatoria. Pro opcional para quitar anuncios y marca de agua.
          </p>
          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/app"
              className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--coral)] px-7 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-[var(--coral-deep)]"
            >
              Convertir un video
            </Link>
            <a
              href="#faq"
              className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--ink)]/15 bg-white/80 px-7 py-3.5 text-base font-semibold text-[var(--ink)]"
            >
              Preguntas frecuentes
            </a>
          </div>
        </section>

        <section className="animate-rise-delay grid gap-8 sm:grid-cols-3" aria-label="Beneficios">
          {[
            {
              t: 'Privado por diseño',
              d: 'La conversión corre en el navegador. Tú controlas el archivo.',
            },
            {
              t: 'Edición útil',
              d: 'Recorte, tamaño, FPS, velocidad, crop, texto, invertir y loop.',
            },
            {
              t: 'Pro cuando lo necesites',
              d: priceHint
                ? `Sin anuncios ni marca de agua. ${priceHint}`
                : 'Sin anuncios ni marca de agua. El precio aparece en Stripe Checkout.',
            },
          ].map((item) => (
            <div key={item.t} className="border-l-2 border-[var(--coral)]/40 pl-4">
              <h2 className="font-display text-xl text-[var(--ink)]">{item.t}</h2>
              <p className="mt-2 text-[var(--ink)]/70">{item.d}</p>
            </div>
          ))}
        </section>

        <section id="faq" className="space-y-6" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-3xl text-[var(--ink)]">
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-4 open:shadow-[var(--shadow)]"
              >
                <summary className="cursor-pointer list-none font-semibold text-[var(--ink)] focus-ring rounded-lg">
                  {item.q}
                </summary>
                <p className="mt-3 text-[var(--ink)]/70">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
