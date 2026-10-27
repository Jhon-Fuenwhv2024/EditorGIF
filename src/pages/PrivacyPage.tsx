import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'

export function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <SiteHeader />
      <article className="prose-fotogif flex-1 space-y-5 text-[var(--ink)]/85">
        <h1 className="font-display text-4xl text-[var(--ink)]">Privacidad</h1>
        <p className="text-sm text-[var(--ink)]/55">Última actualización: octubre 2026</p>
        <p>
          Fotogif es una herramienta web para convertir video a GIF. Esta política
          describe qué datos tratamos y con qué fin. Es un texto básico orientado a
          requisitos típicos de Google AdSense y Stripe; adáptalo con tu asesoría
          legal si lo necesitas.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Conversión local</h2>
        <p>
          La generación del GIF se realiza en tu navegador (FFmpeg.wasm). No
          operamos un almacenamiento permanente de tus videos o GIFs en nuestros
          servidores por el hecho de convertir.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Importación por enlace</h2>
        <p>
          Si pegas una URL (p. ej. Google Drive), un endpoint puede descargar el
          archivo de forma temporal para entregártelo al navegador (principalmente
          por limitaciones CORS). No usamos ese contenido para publicidad ni lo
          guardamos como biblioteca de usuarios.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Anuncios (AdSense)</h2>
        <p>
          Si activamos Google AdSense mediante variables de entorno, Google puede
          usar cookies y tecnologías similares para mostrar anuncios. Solo
          cargamos el script tras tu consentimiento en el banner de cookies. Puedes
          rechazarlo y seguir usando la app.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Pagos (Stripe)</h2>
        <p>
          Las suscripciones Pro las procesa Stripe. Tratamos el email que indiques
          para crear el checkout, restaurar la compra y abrir el portal de cliente.
          El estado Pro se verifica consultando Stripe; no almacenamos números de
          tarjeta. Consulta también la política de Stripe.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Datos en tu dispositivo</h2>
        <p>
          Guardamos en <code>localStorage</code> preferencias como el email Pro (si
          lo restauraste) y tu decisión de cookies. Puedes borrarlas desde los
          ajustes del navegador.
        </p>
        <h2 className="font-display text-2xl text-[var(--ink)]">Contacto</h2>
        <p>
          Para ejercer derechos o consultas de privacidad, usa el canal de contacto
          que indiques en tu sitio o repositorio de GitHub.
        </p>
      </article>
      <SiteFooter />
    </div>
  )
}
