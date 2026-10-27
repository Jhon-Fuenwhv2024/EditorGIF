import { useRef, useState } from 'react'
import { isAcceptedVideo } from '../lib/format'
import { fetchVideoFromUrl } from '../lib/remoteVideo'

type Props = {
  onFile: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkStatus, setLinkStatus] = useState<string | null>(null)

  function handleFile(file: File | undefined | null) {
    setError(null)
    if (!file) return
    if (!isAcceptedVideo(file)) {
      setError('Usa un video MP4, WebM o MOV.')
      return
    }
    onFile(file)
  }

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLinkStatus(null)
    const value = link.trim()
    if (!value) {
      setError('Pega un enlace de video o de Google Drive.')
      return
    }

    setLinkBusy(true)
    try {
      const file = await fetchVideoFromUrl(value, (p) => setLinkStatus(p.message))
      if (!isAcceptedVideo(file) && !file.type.startsWith('video/')) {
        throw new Error('El enlace no parece un video MP4, WebM o MOV.')
      }
      onFile(file)
      setLink('')
      setLinkStatus(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el video desde el enlace.')
      setLinkStatus(null)
    } finally {
      setLinkBusy(false)
    }
  }

  const busy = disabled || linkBusy

  return (
    <div className="animate-rise-delay mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-[1.15fr_0.85fr] md:items-stretch">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-label="Zona para subir video. Arrastra un archivo o pulsa para elegir."
        className={`focus-ring group relative flex min-h-[20rem] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed px-6 py-10 text-center shadow-[var(--shadow)] transition duration-300 sm:rounded-[2rem] sm:px-10 sm:py-14 ${
          dragging
            ? 'scale-[1.01] border-[var(--coral)] bg-[var(--coral)]/10'
            : 'border-white/80 bg-white/75 hover:border-[var(--coral)]/45 hover:bg-white/95'
        } ${busy ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--lime)]/45 blur-2xl transition-transform duration-500 group-hover:scale-125"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-[var(--coral)]/20 blur-2xl transition-transform duration-500 group-hover:scale-125"
          aria-hidden
        />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--lime)] shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 16V4m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="font-display text-2xl text-[var(--ink)] sm:text-3xl">
          Crea un GIF desde tu video
        </p>
        <p className="mx-auto mt-3 max-w-md text-base text-[var(--ink)]/70 sm:text-lg">
          Arrastra un archivo aquí o selecciónalo. Compatible con MP4, WebM y MOV.
        </p>
        <span className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--coral)] px-6 py-3 text-sm font-bold text-white shadow-md transition duration-200 group-hover:-translate-y-0.5 group-hover:bg-[var(--coral-deep)]">
          Elegir archivo
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
          className="sr-only"
          disabled={busy}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="flex flex-col justify-center rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[var(--shadow)] backdrop-blur-xl sm:p-6">
        <span className="mb-3 inline-flex w-fit rounded-full bg-[var(--foam)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink)]/60">
          Opción alternativa
        </span>
        <h2 className="font-display text-xl text-[var(--ink)] sm:text-2xl">
          Importar desde un enlace
        </h2>
        <p className="mt-1 text-sm text-[var(--ink)]/65 sm:text-base">
          URL directa, Google Drive (compartido con «Cualquier persona con el enlace») o
          Dropbox. Máx. ~60&nbsp;MB por enlace.
        </p>

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch"
          onSubmit={handleLinkSubmit}
        >
          <label className="sr-only" htmlFor="video-url">
            Enlace del video
          </label>
          <input
            id="video-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://drive.google.com/file/d/…/view"
            value={link}
            disabled={busy}
            onChange={(e) => setLink(e.target.value)}
            className="editor-field focus-ring min-w-0 flex-1 rounded-xl px-4 py-3 text-base text-[var(--ink)] placeholder:text-[var(--ink)]/40"
          />
          <button
            type="submit"
            disabled={busy || !link.trim()}
            className="focus-ring inline-flex items-center justify-center rounded-xl bg-[var(--ink)] px-6 py-3 text-base font-bold text-[var(--lime)] transition hover:bg-[var(--ink-soft)] disabled:opacity-50"
          >
            {linkBusy ? 'Importando…' : 'Importar'}
          </button>
        </form>

        {linkStatus && (
          <p className="mt-3 animate-pulse-soft text-sm font-medium text-[var(--ink)]/70" role="status">
            {linkStatus}
          </p>
        )}

        <ul className="mt-4 space-y-1 text-xs text-[var(--ink)]/55 sm:text-sm">
          <li>Drive: menú Compartir → «Cualquier persona con el enlace» → Viewer.</li>
          <li>Videos más pesados: descárgalos y súbelos como archivo.</li>
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-center text-sm font-medium text-[var(--coral-deep)]">
          {error}
        </p>
      )}
    </div>
  )
}
