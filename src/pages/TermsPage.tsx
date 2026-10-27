import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'

export function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <SiteHeader />
      <article className="flex-1 space-y-5 text-[var(--ink)]/85">
        <h1 className="font-display text-4xl text-[var(--ink)]">Términos de uso</h1>
        <p className="text-sm text-[var(--ink)]/55">Última actualización: octubre 2026</p>
        <p>
          Al usar Fotogif aceptas estos términos básicos. Sustitúyelos o amplíalos
          con asesoría legal según tu jurisdicción y modelo de negocio.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Servicio</h2>
        <p>
          Fotogif permite convertir videos a GIF en el navegador. Se ofrece «tal
          cual», sin garantía de disponibilidad ininterrumpida ni de resultado
          concreto en todos los dispositivos.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Uso aceptable</h2>
        <p>
          Eres responsable del contenido que conviertes y de disponer de derechos
          sobre él. No uses el servicio para material ilegal o que vulnere derechos
          de terceros.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Plan Pro</h2>
        <p>
          La suscripción Pro se factura a través de Stripe según el precio que
          configures en tu cuenta de Stripe (Price ID). Puedes cancelar desde el
          portal de cliente. Tras cancelar, los beneficios Pro dejan de aplicarse
          cuando la suscripción deja de estar activa en Stripe.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Anuncios</h2>
        <p>
          En el plan gratuito pueden mostrarse anuncios de terceros (p. ej. Google
          AdSense) si están configurados y has aceptado cookies de publicidad.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Limitación</h2>
        <p>
          En la medida permitida por la ley, no seremos responsables de daños
          indirectos derivados del uso o la imposibilidad de uso de Fotogif.
        </p>
      </article>
      <SiteFooter />
    </div>
  )
}
