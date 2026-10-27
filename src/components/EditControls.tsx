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
  const presets = [
    { name: 'Ligero', maxWidth: 320, scale: 0.5, fps: 8, detail: 'Menor tamaño' },
    { name: 'Equilibrado', maxWidth: 480, scale: 0.75, fps: 12, detail: 'Uso general' },
    { name: 'Fluido', maxWidth: 640, scale: 1, fps: 18, detail: 'Más detalle' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <fieldset className="col-span-2 space-y-1.5 text-sm">
        <legend className="font-medium text-[var(--ink)]">Ajuste rápido</legend>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                const width = Math.min(
                  sourceWidth * preset.scale,
                  preset.maxWidth,
                )
                onChange({
                  width: Math.min(
                    maxWidth,
                    Math.max(
                      Math.min(96, maxWidth),
                      Math.floor(width / 2) * 2,
                    ),
                  ),
                  fps: preset.fps,
                })
              }}
              className="focus-ring rounded-xl border border-[var(--line)] bg-white px-2 py-1.5 text-left transition hover:border-[var(--coral)]/45 hover:bg-[var(--foam)]"
              aria-label={`${preset.name}: ${preset.detail}, ${preset.fps} FPS`}
            >
              <span className="block text-xs font-bold text-[var(--ink)] sm:text-sm">
                {preset.name}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-[var(--ink)]/55">
                {preset.detail}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-2.5 text-xs sm:text-sm">
        <span className="font-medium text-[var(--ink)]">
          Ancho del GIF: {settings.width}px
        </span>
        <input
          type="range"
          min={Math.min(96, maxWidth)}
          max={maxWidth}
          step={2}
          value={settings.width}
          onChange={(e) => onChange({ width: Number(e.target.value) })}
          className="editor-range"
          aria-valuetext={`${settings.width} píxeles`}
        />
        <span className="text-[10px] text-[var(--ink)]/55">
          Proporcional · {sourceWidth}×{sourceHeight}
        </span>
      </label>

      <label className="flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-2.5 text-xs sm:text-sm">
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
          className="editor-range"
        />
        <span className="text-[10px] text-[var(--ink)]/55">
          Más fluidez · más tamaño
        </span>
      </label>

      <label className="col-span-2 flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-2.5 text-xs sm:text-sm">
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
          className="editor-range"
        />
      </label>

      <fieldset className="col-span-2 flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-white/70 p-2.5 text-sm">
        <legend className="font-medium text-[var(--ink)]">Opciones</legend>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs transition hover:border-[var(--coral)]/40 hover:bg-[var(--foam)]">
            <input
              type="checkbox"
              checked={settings.reverse}
              onChange={(e) => onChange({ reverse: e.target.checked })}
              className="accent-[var(--coral)]"
            />
            Invertir
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs transition hover:border-[var(--coral)]/40 hover:bg-[var(--foam)]">
            <input
              type="checkbox"
              checked={settings.loop}
              onChange={(e) => onChange({ loop: e.target.checked })}
              className="accent-[var(--coral)]"
            />
            Loop infinito
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs transition hover:border-[var(--coral)]/40 hover:bg-[var(--foam)]">
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

      <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="col-span-2 flex flex-col gap-1 text-xs sm:text-sm">
          <span className="font-medium text-[var(--ink)]">
            Texto encima (opcional)
          </span>
          <input
            type="text"
            value={settings.text}
            maxLength={80}
            placeholder="Ej. ¡Hola!"
            onChange={(e) => onChange({ text: e.target.value })}
            className="editor-field focus-ring rounded-xl px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:text-sm">
          <span className="font-medium text-[var(--ink)]">Color</span>
          <input
            type="color"
            value={settings.textColor}
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="editor-field focus-ring h-9 w-14 cursor-pointer rounded-lg p-1"
            aria-label="Color del texto"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:text-sm">
          <span className="font-medium text-[var(--ink)]">
            Tamaño {settings.textSize}
          </span>
          <input
            type="range"
            min={14}
            max={64}
            value={settings.textSize}
            onChange={(e) => onChange({ textSize: Number(e.target.value) })}
            className="editor-range"
            disabled={!settings.text.trim()}
          />
        </label>
      </div>
    </div>
  )
}
