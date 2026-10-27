import { useRef, useState } from 'react'
import { isAcceptedVideo } from '../lib/format'
import { fetchVideoFromUrl } from '../lib/remoteVideo'

type Props = {
  onFile: (file: File) => void
  disabled?: boolean
  maxBytes?: number
  maxMbLabel?: number
}

export function UploadZone({ onFile, disabled, maxBytes, maxMbLabel = 35 }: Props) {
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
      const file = await fetchVideoFromUrl(
        value,
        (p) => setLinkStatus(p.message),
        maxBytes,
      )
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
    <div className="animate-rise-delay mx-auto w-full max-w-3xl space-y-5">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-label="Zona para subir video. Arrastra un archivo o pulsa para elegir."
        className={`focus-ring relative overflow-hidden rounded-[2rem] border-2 border-dashed px-6 py-14 text-center transition duration-300 sm:px-10 sm:py-16 ${
          dragging
            ? 'border-[var(--coral)] bg-[var(--coral)]/10 scale-[1.01]'
            : 'border-[var(--ink)]/20 bg-white/55 hover:border-[var(--ink)]/40 hover:bg-white/75'
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
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--lime)]/40 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-[var(--coral)]/25 blur-2xl"
          aria-hidden
        />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--lime)] shadow-[var(--shadow)]">
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
          Arrastra tu video aquí
        </p>
        <p className="mx-auto mt-3 max-w-md text-base text-[var(--ink)]/70 sm:text-lg">
          o elige un archivo MP4, WebM o MOV. La conversión sigue siendo local en tu
          dispositivo.
        </p>
        <span className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--coral)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--coral-deep)]">
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

      <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow)] backdrop-blur-sm sm:p-6">
        <h2 className="font-display text-xl text-[var(--ink)] sm:text-2xl">
          O pega un enlace
        </h2>
        <p className="mt-1 text-sm text-[var(--ink)]/65 sm:text-base">
          URL directa, Google Drive (compartido con «Cualquier persona con el enlace») o
          Dropbox. Máx. ~{maxMbLabel}&nbsp;MB por enlace.
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
            className="focus-ring min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white/90 px-4 py-3 text-base text-[var(--ink)] placeholder:text-[var(--ink)]/40"
          />
          <button
            type="submit"
            disabled={busy || !link.trim()}
            className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--ink)] px-6 py-3 text-base font-semibold text-[var(--lime)] transition hover:bg-[var(--ink-soft)] disabled:opacity-50"
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
