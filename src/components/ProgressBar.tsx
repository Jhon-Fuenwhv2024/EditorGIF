type Props = {
  ratio: number
  message: string
}

export function ProgressBar({ ratio, message }: Props) {
  const pct = Math.round(Math.min(100, Math.max(0, ratio * 100)))

  return (
    <div
      className="space-y-2"
      role="status"
      aria-live="polite"
      aria-busy={pct < 100}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--ink)]">{message}</span>
        <span className="tabular-nums text-[var(--ink)]/70">{pct}%</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-[var(--ink)]/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Progreso de conversión"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--coral)] to-[var(--lime)] transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  )
}
