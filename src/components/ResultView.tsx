import { formatBytes } from '../lib/format'
import type { GifResult } from '../types'

type Props = {
  result: GifResult
  fileName: string
  onEditAgain: () => void
  onNewVideo: () => void
}

export function ResultView({ result, fileName, onEditAgain, onNewVideo }: Props) {
  const downloadName = fileName.replace(/\.[^.]+$/, '') + '.gif'

  return (
    <section
      className="animate-rise space-y-6 rounded-[2rem] border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow)] backdrop-blur-sm sm:p-8"
      aria-labelledby="result-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral)]">
            Resultado
          </p>
          <h2 id="result-heading" className="font-display mt-1 text-3xl text-[var(--ink)]">
            Tu GIF está listo
          </h2>
        </div>
        <p className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--lime)]">
          {formatBytes(result.size)}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--ink)]/5 p-3 sm:p-4">
        <img
          src={result.url}
          alt="Vista previa del GIF convertido"
          className="mx-auto max-h-[420px] w-auto max-w-full object-contain"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href={result.url}
          download={downloadName}
          className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--coral)] px-6 py-3 text-center text-base font-semibold text-white shadow-md transition hover:bg-[var(--coral-deep)]"
        >
          Descargar GIF
        </a>
        <button
          type="button"
          onClick={onEditAgain}
          className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--ink)]/20 bg-white px-6 py-3 text-base font-semibold text-[var(--ink)] transition hover:bg-[var(--foam)]"
        >
          Volver a editar
        </button>
        <button
          type="button"
          onClick={onNewVideo}
          className="focus-ring inline-flex items-center justify-center rounded-full border border-transparent px-6 py-3 text-base font-semibold text-[var(--ink)]/80 underline-offset-4 hover:underline"
        >
          Otro video
        </button>
      </div>
    </section>
  )
}
