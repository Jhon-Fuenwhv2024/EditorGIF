import type { EditSettings } from '../types'

type Props = {
  settings: EditSettings
  sourceWidth: number
  sourceHeight: number
  onChange: (patch: Partial<EditSettings>) => void
}

export function EditControls({
  settings,
  sourceWidth,
  sourceHeight,
  onChange,
}: Props) {
  const maxWidth = Math.max(64, sourceWidth)

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-[var(--ink)]">
          Ancho del GIF: {settings.width}px
        </span>
        <input
          type="range"
          min={96}
          max={maxWidth}
          step={2}
          value={settings.width}
          onChange={(e) => onChange({ width: Number(e.target.value) })}
          className="accent-[var(--coral)]"
          aria-valuetext={`${settings.width} píxeles`}
        />
        <span className="text-xs text-[var(--ink)]/60">
          Altura proporcional · origen {sourceWidth}×{sourceHeight}
        </span>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-[var(--ink)]">
          FPS: {settings.fps}
        </span>
        <input
          type="range"
          min={4}
          max={24}
          step={1}
          value={settings.fps}
          onChange={(e) => onChange({ fps: Number(e.target.value) })}
          className="accent-[var(--coral)]"
        />
        <span className="text-xs text-[var(--ink)]/60">
          Más FPS = más fluido y más pesado
        </span>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-[var(--ink)]">
          Velocidad: {settings.speed.toFixed(1)}×
        </span>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={settings.speed}
          onChange={(e) => onChange({ speed: Number(e.target.value) })}
          className="accent-[var(--coral)]"
        />
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium text-[var(--ink)]">Opciones</legend>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2">
            <input
              type="checkbox"
              checked={settings.reverse}
              onChange={(e) => onChange({ reverse: e.target.checked })}
              className="accent-[var(--coral)]"
            />
            Invertir
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2">
            <input
              type="checkbox"
              checked={settings.loop}
              onChange={(e) => onChange({ loop: e.target.checked })}
              className="accent-[var(--coral)]"
            />
            Loop infinito
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2">
            <input
              type="checkbox"
              checked={!!settings.crop}
              onChange={(e) => {
                if (e.target.checked) {
                  const w = Math.round(sourceWidth * 0.8)
                  const h = Math.round(sourceHeight * 0.8)
                  onChange({
                    crop: {
                      x: Math.round((sourceWidth - w) / 2),
                      y: Math.round((sourceHeight - h) / 2),
                      width: w,
                      height: h,
                    },
                  })
                } else {
                  onChange({ crop: null })
                }
              }}
              className="accent-[var(--coral)]"
            />
            Recortar área
          </label>
        </div>
      </fieldset>

      <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--ink)]">
            Texto encima (opcional)
          </span>
          <input
            type="text"
            value={settings.text}
            maxLength={80}
            placeholder="Ej. ¡Hola!"
            onChange={(e) => onChange({ text: e.target.value })}
            className="focus-ring rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--ink)]">Color</span>
          <input
            type="color"
            value={settings.textColor}
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="focus-ring h-11 w-full min-w-14 cursor-pointer rounded-xl border border-[var(--line)] bg-white/80 p-1"
            aria-label="Color del texto"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--ink)]">
            Tamaño {settings.textSize}
          </span>
          <input
            type="range"
            min={14}
            max={64}
            value={settings.textSize}
            onChange={(e) => onChange({ textSize: Number(e.target.value) })}
            className="accent-[var(--coral)] mt-2"
            disabled={!settings.text.trim()}
          />
        </label>
      </div>
    </div>
  )
}
