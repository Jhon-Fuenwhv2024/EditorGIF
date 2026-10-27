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
  const dragging = useRef<'start' | 'end' | 'playhead' | 'range' | null>(null)
  const rangeDragOrigin = useRef<{
    pointerTime: number
    start: number
    end: number
    currentTime: number
  } | null>(null)

  const safeDuration = Math.max(duration, 0.1)
  const startPct = (start / safeDuration) * 100
  const endPct = (end / safeDuration) * 100
  const playPct = (clamp(currentTime, 0, safeDuration) / safeDuration) * 100
  const minGap = Math.min(0.2, safeDuration / 2)

  function timeFromClientX(clientX: number): number {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return ratio * safeDuration
  }

  function beginDrag(
    kind: 'start' | 'end' | 'playhead' | 'range',
    clientX: number,
  ) {
    dragging.current = kind
    rangeDragOrigin.current =
      kind === 'range'
        ? { pointerTime: timeFromClientX(clientX), start, end, currentTime }
        : null
    updateDrag(clientX)

    const move = (e: PointerEvent) => updateDrag(e.clientX)
    const up = () => {
      dragging.current = null
      rangeDragOrigin.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function updateDrag(clientX: number) {
    const t = timeFromClientX(clientX)
    if (dragging.current === 'start') {
      onChange(clamp(t, 0, end - minGap), end)
      onSeek(clamp(t, 0, end - minGap))
    } else if (dragging.current === 'end') {
      onChange(start, clamp(t, start + minGap, safeDuration))
      onSeek(clamp(t, start + minGap, safeDuration))
    } else if (dragging.current === 'playhead') {
      onSeek(clamp(t, start, end))
    } else if (dragging.current === 'range') {
      const origin = rangeDragOrigin.current
      if (!origin) return
      const clipDuration = origin.end - origin.start
      const nextStart = clamp(
        origin.start + t - origin.pointerTime,
        0,
        safeDuration - clipDuration,
      )
      const shift = nextStart - origin.start
      const nextEnd = nextStart + clipDuration
      onChange(nextStart, nextEnd)
      onSeek(clamp(origin.currentTime + shift, nextStart, nextEnd))
    }
  }

  function moveSelectionTo(nextStart: number) {
    const clipDuration = end - start
    const clampedStart = clamp(nextStart, 0, safeDuration - clipDuration)
    const shift = clampedStart - start
    const nextEnd = clampedStart + clipDuration
    onChange(clampedStart, nextEnd)
    onSeek(clamp(currentTime + shift, clampedStart, nextEnd))
  }

  function moveSelectionBy(seconds: number) {
    moveSelectionTo(start + seconds)
  }

  function markStartAtPlayhead() {
    const nextStart = clamp(currentTime, 0, end - minGap)
    onChange(nextStart, end)
    onSeek(nextStart)
  }

  function markEndAtPlayhead() {
    const nextEnd = clamp(currentTime, start + minGap, safeDuration)
    onChange(start, nextEnd)
    onSeek(nextEnd)
  }

  function seekBy(seconds: number) {
    onSeek(clamp(currentTime + seconds, start, end))
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
        className="slider-track relative h-14 cursor-crosshair rounded-2xl border border-[var(--line)] bg-[var(--ink)]/8"
        role="group"
        aria-label="Línea de tiempo y recorte"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          beginDrag('playhead', e.clientX)
        }}
      >
        <div
          className="focus-ring absolute inset-y-1 z-[2] cursor-grab touch-none rounded-xl border border-[var(--coral)]/60 bg-[var(--coral)]/30 active:cursor-grabbing"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Mover el tramo seleccionado"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={safeDuration - (end - start)}
          aria-valuenow={start}
          aria-valuetext={`Tramo de ${formatTime(start)} a ${formatTime(end)}`}
          title="Arrastra para mover el tramo completo"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            beginDrag('range', e.clientX)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              moveSelectionBy(e.shiftKey ? -1 : -0.1)
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              moveSelectionBy(e.shiftKey ? 1 : 0.1)
            } else if (e.key === 'Home') {
              e.preventDefault()
              moveSelectionTo(0)
            } else if (e.key === 'End') {
              e.preventDefault()
              moveSelectionTo(safeDuration - (end - start))
            }
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 rounded bg-[var(--coral-deep)]/70 px-1.5 py-1 shadow-sm"
          >
            <span className="h-3 w-0.5 rounded-full bg-white/90" />
            <span className="h-3 w-0.5 rounded-full bg-white/90" />
            <span className="h-3 w-0.5 rounded-full bg-white/90" />
          </span>
        </div>
        <div
          className="pointer-events-none absolute top-1 bottom-1 z-[5] w-0.5 bg-[var(--ink)]"
          style={{ left: `${playPct}%` }}
          aria-hidden
        >
          <span className="absolute -left-[5px] -top-0.5 h-2.5 w-3 rounded-sm bg-[var(--ink)] shadow-sm" />
          <span className="absolute -left-[5px] -bottom-0.5 h-2.5 w-3 rounded-sm bg-[var(--ink)] shadow-sm" />
        </div>

        <button
          id={`${id}-start`}
          type="button"
          className="focus-ring absolute top-1/2 z-10 h-11 w-5 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-white bg-[var(--ink)] text-[var(--foam)] shadow-md transition hover:scale-110"
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
          className="focus-ring absolute top-1/2 z-10 h-11 w-5 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-white bg-[var(--coral)] text-white shadow-md transition hover:scale-110"
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => seekBy(-1)}
            className="focus-ring rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            aria-label="Retroceder un segundo"
          >
            −1 s
          </button>
          <button
            type="button"
            onClick={markStartAtPlayhead}
            className="focus-ring rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            Marcar inicio aquí
          </button>
          <button
            type="button"
            onClick={markEndAtPlayhead}
            className="focus-ring rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            Marcar fin aquí
          </button>
          <button
            type="button"
            onClick={() => seekBy(1)}
            className="focus-ring rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            aria-label="Avanzar un segundo"
          >
            +1 s
          </button>
        </div>
        <span className="text-sm tabular-nums text-[var(--ink)]/65">
          Posición {formatTime(currentTime)}
        </span>
      </div>
      <p className="text-xs text-[var(--ink)]/60">
        Arrastra la zona coloreada para mover el tramo completo sin cambiar su duración.
      </p>

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
