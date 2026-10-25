import { useRef, useState } from 'react'
import { isAcceptedVideo } from '../lib/format'

type Props = {
  onFile: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | undefined | null) {
    setError(null)
    if (!file) return
    if (!isAcceptedVideo(file)) {
      setError('Usa un video MP4, WebM o MOV.')
      return
    }
    onFile(file)
  }

  return (
    <div className="animate-rise-delay mx-auto w-full max-w-3xl">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Zona para subir video. Arrastra un archivo o pulsa para elegir."
        className={`focus-ring relative overflow-hidden rounded-[2rem] border-2 border-dashed px-6 py-14 text-center transition duration-300 sm:px-10 sm:py-16 ${
          dragging
            ? 'border-[var(--coral)] bg-[var(--coral)]/10 scale-[1.01]'
            : 'border-[var(--ink)]/20 bg-white/55 hover:border-[var(--ink)]/40 hover:bg-white/75'
        } ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
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
          o elige un archivo MP4, WebM o MOV. Todo se convierte en tu dispositivo;
          no se sube a ningún servidor.
        </p>
        <span className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--coral)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--coral-deep)]">
          Elegir archivo
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-medium text-[var(--coral-deep)]">
          {error}
        </p>
      )}
    </div>
  )
}
