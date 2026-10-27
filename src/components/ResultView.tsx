import { AdUnit } from './AdUnit'
import { ShareGif } from './ShareGif'
import { formatBytes } from '../lib/format'
import type { GifResult } from '../types'

type Props = {
  result: GifResult
  fileName: string
  onEditAgain: () => void
  onNewVideo: () => void
  showAd?: boolean
}

export function ResultView({
  result,
  fileName,
  onEditAgain,
  onNewVideo,
  showAd = false,
}: Props) {
  const safeName =
    fileName
      .replace(/\.gif$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .trim()
      .replace(/[. ]+$/, '') || 'fotogif'
  const downloadName = `${safeName}.gif`

  return (
    <section
      className="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/85 p-3 shadow-[var(--shadow)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-4 lg:p-5"
      aria-labelledby="result-heading"
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--lime)] shadow-sm"
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="m5 12 4 4L19 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--coral)] sm:text-[10px]">
              Listo
            </p>
            <h2
              id="result-heading"
              className="font-display mt-0.5 text-xl leading-tight text-[var(--ink)] sm:text-2xl"
            >
              Tu GIF está listo
            </h2>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:grid-rows-1 lg:gap-5">
        <div className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[#f4f4ef] p-1.5 shadow-inner sm:p-2">
          <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-[1rem] bg-[#101816]">
            <img
              src={result.url}
              alt="Vista previa del GIF convertido"
              className="block h-full w-full object-contain"
            />
          </div>
        </div>

        <aside className="flex min-h-0 flex-col justify-center gap-2.5 rounded-[1.4rem] border border-[var(--line)] bg-white/80 p-3 shadow-[0_12px_30px_rgba(26,42,37,0.07)] sm:gap-3 sm:p-4 lg:self-center">
          <div className="min-w-0">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/50 sm:text-[10px]">
              Nombre del archivo
            </p>
            <p
              className="break-all rounded-xl border border-[var(--line)] bg-[var(--sand)] px-3 py-2.5 text-xs font-semibold leading-snug text-[var(--ink)] sm:text-sm"
              title={downloadName}
            >
              {downloadName}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-2.5">
            <span className="text-xs font-medium text-[var(--ink)]/65 sm:text-sm">
              Tamaño del GIF
            </span>
            <span className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-bold text-[var(--lime)] sm:text-sm">
              {formatBytes(result.size)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 lg:grid-cols-1">
            <a
              href={result.url}
              download={downloadName}
              className="focus-ring col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--coral)] to-[var(--coral-deep)] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_8px_18px_rgba(228,92,77,0.24)] transition duration-200 hover:-translate-y-0.5 lg:col-span-1 lg:py-3 lg:text-base"
            >
              Descargar GIF
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <button
              type="button"
              onClick={onEditAgain}
              className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--ink)]/25 bg-white px-2 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]/50 hover:bg-[var(--foam)] sm:text-sm lg:py-2.5"
            >
              Volver a editar
            </button>
            <button
              type="button"
              onClick={onNewVideo}
              className="focus-ring inline-flex items-center justify-center rounded-full px-2 py-2 text-xs font-semibold text-[var(--ink)]/75 transition hover:bg-[var(--foam)] sm:text-sm lg:py-2.5"
            >
              Otro video
            </button>
          </div>
        </aside>
      </div>

      <div className="mt-4 shrink-0 space-y-4 border-t border-[var(--line)] pt-4">
        <ShareGif gifUrl={result.url} fileName={downloadName} />
        {showAd && <AdUnit slot="result" />}
      </div>
    </section>
  )
}
