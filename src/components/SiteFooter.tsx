import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--line)] pt-6 text-sm text-[var(--ink)]/55">
      <p>
        Fotogif convierte video a GIF en tu navegador. Los archivos de conversión no
        se suben a nuestros servidores.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link to="/privacidad" className="underline-offset-2 hover:underline">
          Privacidad
        </Link>
        <Link to="/terminos" className="underline-offset-2 hover:underline">
          Términos
        </Link>
        <Link to="/app" className="underline-offset-2 hover:underline">
          Abrir editor
        </Link>
      </p>
    </footer>
  )
}
