import { useId, useRef } from 'react'
import { clamp, formatTime } from '../lib/format'

type Props = {
  duration: number
  start: number
  end: number
  currentTime: number
  onChange: (start: number, end: number) => void
  onSeek: (time: number) => void
}

export function TrimSlider({
  duration,
  start,
  end,
  currentTime,
  onChange,
  onSeek,
}: Props) {
  const id = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | 'playhead' | null>(null)

  const safeDuration = Math.max(duration, 0.1)
  const startPct = (start / safeDuration) * 100
  const endPct = (end / safeDuration) * 100
  const playPct = (clamp(currentTime, 0, safeDuration) / safeDuration) * 100

  function timeFromClientX(clientX: number): number {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return ratio * safeDuration
  }

  function beginDrag(kind: 'start' | 'end' | 'playhead', clientX: number) {
    dragging.current = kind
    updateDrag(clientX)

    const move = (e: PointerEvent) => updateDrag(e.clientX)
    const up = () => {
      dragging.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function updateDrag(clientX: number) {
    const t = timeFromClientX(clientX)
    const minGap = Math.min(0.2, safeDuration / 2)
    if (dragging.current === 'start') {
      onChange(clamp(t, 0, end - minGap), end)
      onSeek(clamp(t, 0, end - minGap))
    } else if (dragging.current === 'end') {
      onChange(start, clamp(t, start + minGap, safeDuration))
      onSeek(clamp(t, start + minGap, safeDuration))
    } else if (dragging.current === 'playhead') {
      onSeek(clamp(t, start, end))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
        <label htmlFor={`${id}-start`} className="font-medium">
          Inicio {formatTime(start)}
        </label>
        <span className="tabular-nums text-[var(--ink)]/70">
          Duración del clip: {formatTime(end - start)}
        </span>
        <label htmlFor={`${id}-end`} className="font-medium">
          Fin {formatTime(end)}
        </label>
      </div>

      <div
        ref={trackRef}
        className="slider-track relative h-12 rounded-2xl bg-[var(--ink)]/8 border border-[var(--line)]"
        role="group"
        aria-label="Recorte de inicio y fin"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            beginDrag('playhead', e.clientX)
          }
        }}
      >
        <div
          className="absolute inset-y-1 rounded-xl bg-[var(--coral)]/25 border border-[var(--coral)]/40"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        <div
          className="absolute top-1 bottom-1 w-0.5 bg-[var(--ink)]/70"
          style={{ left: `${playPct}%` }}
          aria-hidden
        />

        <button
          id={`${id}-start`}
          type="button"
          className="focus-ring absolute top-1/2 z-10 h-10 w-4 -translate-x-1/2 -translate-y-1/2 rounded-md bg-[var(--ink)] text-[var(--foam)] shadow-md"
          style={{ left: `${startPct}%` }}
          aria-label={`Inicio del clip, ${formatTime(start)}`}
          aria-valuemin={0}
          aria-valuemax={end}
          aria-valuenow={start}
          role="slider"
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            beginDrag('start', e.clientX)
          }}
        >
          <span className="sr-only">Inicio</span>
        </button>

        <button
          id={`${id}-end`}
          type="button"
          className="focus-ring absolute top-1/2 z-10 h-10 w-4 -translate-x-1/2 -translate-y-1/2 rounded-md bg-[var(--coral)] text-white shadow-md"
          style={{ left: `${endPct}%` }}
          aria-label={`Fin del clip, ${formatTime(end)}`}
          aria-valuemin={start}
          aria-valuemax={safeDuration}
          aria-valuenow={end}
          role="slider"
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            beginDrag('end', e.clientX)
          }}
        >
          <span className="sr-only">Fin</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--ink)]/70">Inicio (s)</span>
          <input
            type="number"
            min={0}
            max={end}
            step={0.1}
            value={Number(start.toFixed(1))}
            onChange={(e) => {
              const v = clamp(Number(e.target.value) || 0, 0, end - 0.1)
              onChange(v, end)
              onSeek(v)
            }}
            className="focus-ring rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--ink)]/70">Fin (s)</span>
          <input
            type="number"
            min={start}
            max={safeDuration}
            step={0.1}
            value={Number(end.toFixed(1))}
            onChange={(e) => {
              const v = clamp(Number(e.target.value) || 0, start + 0.1, safeDuration)
              onChange(start, v)
              onSeek(v)
            }}
            className="focus-ring rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
        </label>
      </div>
    </div>
  )
}
