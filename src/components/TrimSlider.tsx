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
    pointerX: number
    start: number
    end: number
    currentTime: number
    moved: boolean
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
        ? {
            pointerTime: timeFromClientX(clientX),
            pointerX: clientX,
            start,
            end,
            currentTime,
            moved: false,
          }
        : null
    if (kind !== 'range') updateDrag(clientX)

    let animationFrame: number | null = null
    let pendingClientX = clientX
    const move = (e: PointerEvent) => {
      pendingClientX = e.clientX
      if (animationFrame !== null) return
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null
        updateDrag(pendingClientX)
      })
    }
    const finish = (e: PointerEvent) => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
      animationFrame = null
      updateDrag(e.clientX)
      const origin = rangeDragOrigin.current
      if (dragging.current === 'range' && origin && !origin.moved) {
        onSeek(clamp(timeFromClientX(e.clientX), start, end))
      }
      dragging.current = null
      rangeDragOrigin.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
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
      if (!origin.moved && Math.abs(clientX - origin.pointerX) < 4) return
      origin.moved = true
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
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[var(--foam)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
            INICIO {formatTime(start)}
          </span>
          <span className="text-xs text-[var(--ink)]/40">→</span>
          <span className="rounded-lg bg-[var(--coral)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--coral-deep)]">
            FIN {formatTime(end)}
          </span>
        </div>
        <span className="rounded-lg bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
          {formatTime(end - start)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="slider-track timeline-track relative h-[3.75rem] cursor-crosshair rounded-xl border border-[var(--line)] bg-[#edf1ef] shadow-inner"
        role="group"
        aria-label="Línea de tiempo y recorte"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          beginDrag('playhead', e.clientX)
        }}
      >
        <div
          className="focus-ring absolute inset-y-1 z-[2] cursor-grab touch-none rounded-lg border border-[var(--coral)]/60 bg-gradient-to-b from-[#f7b2a7]/70 to-[#ee8173]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] active:cursor-grabbing"
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
            className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 rounded bg-[var(--coral-deep)]/75 px-1.5 py-1 shadow-sm"
          >
            <span className="h-3 w-0.5 rounded-full bg-white/90" />
            <span className="h-3 w-0.5 rounded-full bg-white/90" />
            <span className="h-3 w-0.5 rounded-full bg-white/90" />
          </span>
        </div>
        <div
          className="pointer-events-none absolute bottom-1 top-1 z-[5] w-0.5 rounded-full bg-[var(--ink)] shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
          style={{ left: `${playPct}%` }}
          aria-hidden
        >
          <span className="absolute -left-[5px] -top-0.5 h-2.5 w-3 rounded-sm bg-[var(--ink)] shadow-sm" />
          <span className="absolute -left-[5px] -bottom-0.5 h-2.5 w-3 rounded-sm bg-[var(--ink)] shadow-sm" />
        </div>

        <button
          type="button"
          className="focus-ring absolute top-1/2 z-[15] h-8 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-[var(--ink)] shadow-[0_2px_8px_rgba(12,31,28,0.35)] transition-transform active:scale-110 active:cursor-grabbing"
          style={{ left: `${playPct}%` }}
          role="slider"
          aria-label={`Posición de reproducción, ${formatTime(currentTime)}`}
          aria-orientation="horizontal"
          aria-valuemin={start}
          aria-valuemax={end}
          aria-valuenow={clamp(currentTime, start, end)}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            beginDrag('playhead', e.clientX)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              onSeek(clamp(currentTime - (e.shiftKey ? 1 : 0.1), start, end))
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              onSeek(clamp(currentTime + (e.shiftKey ? 1 : 0.1), start, end))
            } else if (e.key === 'Home') {
              e.preventDefault()
              onSeek(start)
            } else if (e.key === 'End') {
              e.preventDefault()
              onSeek(end)
            }
          }}
          title="Arrastra para mover la reproducción"
        >
          <span className="sr-only">Mover posición de reproducción</span>
        </button>

        <button
          id={`${id}-start`}
          type="button"
          className="focus-ring absolute top-1/2 z-20 flex h-10 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--ink)] text-[var(--foam)] shadow-md transition hover:scale-110"
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
          className="focus-ring absolute top-1/2 z-20 flex h-10 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--coral)] text-white shadow-md transition hover:scale-110"
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
            className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--coral)]/35 hover:bg-[var(--foam)]"
            aria-label="Retroceder un segundo"
          >
            −1 s
          </button>
          <button
            type="button"
            onClick={markStartAtPlayhead}
            className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--coral)]/35 hover:bg-[var(--foam)]"
          >
            Marcar inicio aquí
          </button>
          <button
            type="button"
            onClick={markEndAtPlayhead}
            className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--coral)]/35 hover:bg-[var(--foam)]"
          >
            Marcar fin aquí
          </button>
          <button
            type="button"
            onClick={() => seekBy(1)}
            className="focus-ring rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--coral)]/35 hover:bg-[var(--foam)]"
            aria-label="Avanzar un segundo"
          >
            +1 s
          </button>
        </div>
        <span className="rounded-lg bg-[var(--foam)] px-2.5 py-1.5 text-xs font-medium tabular-nums text-[var(--ink)]/70">
          Posición {formatTime(currentTime)}
        </span>
      </div>
      <p className="text-[11px] text-[var(--ink)]/50">
        Arrastra los extremos para recortar; arrastra el centro para mover el tramo.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--ink)]/60">Inicio · segundos</span>
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
            className="editor-field focus-ring rounded-xl px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--ink)]/60">Fin · segundos</span>
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
            className="editor-field focus-ring rounded-xl px-3 py-2"
          />
        </label>
      </div>
    </div>
  )
}
