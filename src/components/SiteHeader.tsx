import { Link, NavLink } from 'react-router-dom'
import { usePro } from '../lib/pro'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `focus-ring rounded-full px-3 py-1.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-[var(--ink)] text-[var(--lime)]'
      : 'text-[var(--ink)]/75 hover:bg-white/60'
  }`

export function SiteHeader() {
  const { isPro } = usePro()

  return (
    <header className="animate-rise mb-8 flex flex-wrap items-center justify-between gap-4 sm:mb-10">
      <Link to="/" className="focus-ring font-display text-3xl text-[var(--ink)] sm:text-4xl">
        Fotogif
      </Link>
      <nav className="flex flex-wrap items-center gap-1 sm:gap-2" aria-label="Principal">
        <NavLink to="/" end className={linkClass}>
          Inicio
        </NavLink>
        <NavLink to="/app" className={linkClass}>
          Convertir
        </NavLink>
        <NavLink to="/privacidad" className={linkClass}>
          Privacidad
        </NavLink>
        <NavLink to="/terminos" className={linkClass}>
          Términos
        </NavLink>
        {isPro ? (
          <span className="ml-1 rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--lime)]">
            Pro
          </span>
        ) : (
          <span className="ml-1 rounded-full border border-[var(--ink)]/15 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]/70">
            Local
          </span>
        )}
      </nav>
    </header>
  )
}
