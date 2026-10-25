import { useRef } from 'react'
import type { CropRect } from '../types'
import { clamp } from '../lib/format'

type Props = {
  enabled: boolean
  videoWidth: number
  videoHeight: number
  crop: CropRect | null
  onChange: (crop: CropRect) => void
}

export function CropOverlay({
  enabled,
  videoWidth,
  videoHeight,
  crop,
  onChange,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    mode: 'move' | 'br'
    startX: number
    startY: number
    origin: CropRect
  } | null>(null)

  if (!enabled || !crop || videoWidth <= 0 || videoHeight <= 0) return null

  const left = (crop.x / videoWidth) * 100
  const top = (crop.y / videoHeight) * 100
  const width = (crop.width / videoWidth) * 100
  const height = (crop.height / videoHeight) * 100

  function clientToVideo(clientX: number, clientY: number) {
    const el = boxRef.current?.parentElement
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * videoWidth,
      y: ((clientY - rect.top) / rect.height) * videoHeight,
    }
  }

  function onPointerDown(
    mode: 'move' | 'br',
    e: React.PointerEvent,
  ) {
    e.preventDefault()
    e.stopPropagation()
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...crop! },
    }
    const move = (ev: PointerEvent) => {
      if (!drag.current) return
      const start = clientToVideo(drag.current.startX, drag.current.startY)
      const now = clientToVideo(ev.clientX, ev.clientY)
      const dx = now.x - start.x
      const dy = now.y - start.y
      const o = drag.current.origin

      if (drag.current.mode === 'move') {
        const nx = clamp(o.x + dx, 0, videoWidth - o.width)
        const ny = clamp(o.y + dy, 0, videoHeight - o.height)
        onChange({ ...o, x: nx, y: ny })
      } else {
        const nw = clamp(o.width + dx, 32, videoWidth - o.x)
        const nh = clamp(o.height + dy, 32, videoHeight - o.y)
        onChange({ ...o, width: nw, height: nh })
      }
    }
    const up = () => {
      drag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={boxRef}
      className="pointer-events-auto absolute border-2 border-[var(--lime)] bg-[var(--lime)]/10 shadow-[0_0_0_9999px_rgba(12,31,28,0.45)]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      role="presentation"
      onPointerDown={(e) => onPointerDown('move', e)}
    >
      <button
        type="button"
        aria-label="Redimensionar área de recorte"
        className="focus-ring absolute -bottom-2 -right-2 h-5 w-5 rounded-full border-2 border-[var(--ink)] bg-[var(--lime)]"
        onPointerDown={(e) => onPointerDown('br', e)}
      />
    </div>
  )
}
