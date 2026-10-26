import { useEffect, useRef, useState } from 'react'
import { CropOverlay } from './components/CropOverlay'
import { EditControls } from './components/EditControls'
import { ProgressBar } from './components/ProgressBar'
import { ResultView } from './components/ResultView'
import { TrimSlider } from './components/TrimSlider'
import { UploadZone } from './components/UploadZone'
import { convertToGif, estimateOutputDuration } from './lib/ffmpeg'
import { formatTime } from './lib/format'
import {
  DEFAULT_SETTINGS,
  type ConversionProgress,
  type EditSettings,
  type GifResult,
  type VideoSource,
} from './types'

type Stage = 'upload' | 'edit' | 'converting' | 'result'

function suggestWidth(sourceWidth: number): number {
  return Math.min(480, Math.max(160, Math.round(sourceWidth / 2 / 2) * 2))
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stage, setStage] = useState<Stage>('upload')
  const [source, setSource] = useState<VideoSource | null>(null)
  const [settings, setSettings] = useState<EditSettings | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [progress, setProgress] = useState<ConversionProgress>({
    ratio: 0,
    message: '',
  })
  const [result, setResult] = useState<GifResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)

  useEffect(() => {
    return () => {
      if (source?.url) URL.revokeObjectURL(source.url)
      if (result?.url) URL.revokeObjectURL(result.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || stage !== 'edit' || !settings) return

    const onTime = () => {
      setCurrentTime(video.currentTime)
      if (video.currentTime >= settings.end) {
        video.currentTime = settings.start
      }
    }
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [stage, settings])

  async function loadVideo(file: File) {
    setError(null)
    setLoadingMeta(true)
    setResult((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })

    const url = URL.createObjectURL(file)
    try {
      const meta = await readVideoMeta(url)
      setSource((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url)
        return {
          file,
          url,
          name: file.name,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
        }
      })
      setSettings({
        ...DEFAULT_SETTINGS,
        start: 0,
        end: Math.min(meta.duration, 4),
        width: suggestWidth(meta.width),
      })
      setStage('edit')
      setCurrentTime(0)
    } catch {
      URL.revokeObjectURL(url)
      setError('No se pudo leer el video. Prueba con otro archivo.')
    } finally {
      setLoadingMeta(false)
    }
  }

  function patchSettings(patch: Partial<EditSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function seekTo(time: number) {
    const video = videoRef.current
    if (video) {
      video.currentTime = time
      setCurrentTime(time)
    }
  }

  async function handleConvert() {
    if (!source || !settings) return
    setError(null)
    setStage('converting')
    setProgress({ ratio: 0, message: 'Preparando conversión…' })

    try {
      const blob = await convertToGif(
        source.file,
        settings,
        source.height,
        setProgress,
      )
      const url = URL.createObjectURL(blob)
      setResult((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url)
        return { blob, url, size: blob.size }
      })
      setStage('result')
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : 'La conversión falló. Intenta con un clip más corto o menos FPS.',
      )
      setStage('edit')
    }
  }

  function resetAll() {
    setSource((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    setResult((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    setSettings(null)
    setStage('upload')
    setError(null)
    setCurrentTime(0)
  }

  const estimated = settings ? estimateOutputDuration(settings) : 0

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <header className="animate-rise mb-8 sm:mb-12">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-3xl text-[var(--ink)] sm:text-4xl md:text-5xl">
            Fotogif
          </p>
          <span className="rounded-full border border-[var(--ink)]/15 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]/70">
            100% local
          </span>
        </div>
        {stage === 'upload' && (
          <p className="mt-4 max-w-xl text-lg text-[var(--ink)]/75 sm:text-xl">
            Convierte video a GIF en el navegador: súbelo, pégalo desde un enlace o
            Google Drive, recorta y descarga.
          </p>
        )}
      </header>

      <main id="contenido" className="flex flex-1 flex-col gap-8">
        {stage === 'upload' && (
          <UploadZone onFile={loadVideo} disabled={loadingMeta} />
        )}

        {loadingMeta && (
          <p className="animate-pulse-soft text-center text-[var(--ink)]/70" role="status">
            Leyendo video…
          </p>
        )}

        {(stage === 'edit' || stage === 'converting') && source && settings && (
          <section
            className="animate-rise space-y-6 rounded-[2rem] border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow)] backdrop-blur-sm sm:p-7"
            aria-labelledby="edit-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral)]">
                  Edición
                </p>
                <h2
                  id="edit-heading"
                  className="font-display mt-1 text-2xl text-[var(--ink)] sm:text-3xl"
                >
                  Ajusta antes de convertir
                </h2>
                <p className="mt-1 text-sm text-[var(--ink)]/65">
                  {source.name} · {formatTime(source.duration)} · clip ≈{' '}
                  {formatTime(estimated)}
                </p>
              </div>
              <button
                type="button"
                onClick={resetAll}
                disabled={stage === 'converting'}
                className="focus-ring text-sm font-semibold text-[var(--ink)]/70 underline-offset-4 hover:underline disabled:opacity-50"
              >
                Cambiar video
              </button>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[var(--ink)]">
              <div className="relative mx-auto max-h-[440px] w-fit max-w-full">
                <video
                  ref={videoRef}
                  src={source.url}
                  className="max-h-[440px] w-auto max-w-full"
                  playsInline
                  controls
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = settings.start
                  }}
                />
                <div className="pointer-events-none absolute inset-0">
                  <CropOverlay
                    enabled={!!settings.crop}
                    videoWidth={source.width}
                    videoHeight={source.height}
                    crop={settings.crop}
                    onChange={(crop) => patchSettings({ crop })}
                  />
                </div>
                {settings.text.trim() && (
                  <p
                    className="pointer-events-none absolute bottom-3 left-1/2 max-w-[90%] -translate-x-1/2 text-center font-semibold"
                    style={{
                      color: settings.textColor,
                      fontSize: `clamp(12px, ${settings.textSize * 0.45}px, 36px)`,
                      textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                    }}
                    aria-hidden
                  >
                    {settings.text}
                  </p>
                )}
              </div>
            </div>

            <TrimSlider
              duration={source.duration}
              start={settings.start}
              end={settings.end}
              currentTime={currentTime}
              onChange={(start, end) => patchSettings({ start, end })}
              onSeek={seekTo}
            />

            <EditControls
              settings={settings}
              sourceWidth={source.width}
              sourceHeight={source.height}
              onChange={patchSettings}
            />

            {stage === 'converting' ? (
              <ProgressBar ratio={progress.ratio} message={progress.message} />
            ) : (
              <button
                type="button"
                onClick={handleConvert}
                className="focus-ring w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-base font-semibold text-[var(--lime)] shadow-md transition hover:bg-[var(--ink-soft)] sm:w-auto"
              >
                Convertir a GIF
              </button>
            )}
          </section>
        )}

        {stage === 'result' && result && source && (
          <ResultView
            result={result}
            fileName={source.name}
            onEditAgain={() => setStage('edit')}
            onNewVideo={resetAll}
          />
        )}

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-4 py-3 text-sm font-medium text-[var(--coral-deep)]"
          >
            {error}
          </p>
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--line)] pt-6 text-sm text-[var(--ink)]/55">
        <p>
          Fotogif usa FFmpeg.wasm en tu navegador. Los archivos no salen de tu
          dispositivo.
        </p>
      </footer>
    </div>
  )
}

function readVideoMeta(url: string): Promise<{
  duration: number
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url
    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const width = video.videoWidth || 0
      const height = video.videoHeight || 0
      cleanup()
      if (!duration || !width || !height) {
        reject(new Error('metadata'))
        return
      }
      resolve({ duration, width, height })
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('load'))
    }
  })
}
