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
  const maxWidth = Math.max(64, sourceWidth)
  return Math.min(
    maxWidth,
    480,
    Math.max(160, Math.round(sourceWidth / 2 / 2) * 2),
  )
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stage, setStage] = useState<Stage>('upload')
  const [source, setSource] = useState<VideoSource | null>(null)
  const [settings, setSettings] = useState<EditSettings | null>(null)
  const [outputName, setOutputName] = useState('')
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
      setOutputName(file.name.replace(/\.[^.]+$/, ''))
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
    setOutputName('')
    setStage('upload')
    setError(null)
    setCurrentTime(0)
  }

  const estimated = settings ? estimateOutputDuration(settings) : 0

  return (
    <div
      className={`mx-auto flex w-full max-w-[1920px] flex-col px-2 sm:px-4 xl:px-6 ${
        stage === 'result'
          ? 'h-dvh overflow-hidden py-2 sm:py-3'
          : 'min-h-screen pb-8 pt-3 sm:pt-5'
      }`}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <header
        className={`animate-rise flex flex-wrap items-center justify-between gap-3 ${
          stage === 'result' ? 'mb-2 shrink-0' : 'mb-3 sm:mb-4'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--lime)] shadow-md sm:h-11 sm:w-11" aria-hidden>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
            </svg>
          </span>
          <p className="font-display text-2xl text-[var(--ink)] sm:text-3xl">
            Fotogif
          </p>
          {(stage === 'edit' || stage === 'converting') && source && settings && (
            <div className="ml-1 min-w-0 border-l border-[var(--line)] pl-3 sm:ml-2 sm:pl-4">
              <label
                htmlFor="output-name"
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink)]/50"
              >
                Nombre del GIF
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="output-name"
                  type="text"
                  value={outputName}
                  maxLength={80}
                  placeholder="mi-gif"
                  onChange={(e) => setOutputName(e.target.value)}
                  disabled={stage === 'converting'}
                  className="editor-field focus-ring min-w-0 w-36 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--ink)] sm:w-52"
                />
                <span className="text-xs font-semibold text-[var(--ink)]/50">
                  .gif
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--ink)]/55 sm:text-xs">
                Video {formatTime(source.duration)} · clip {formatTime(estimated)}
              </p>
            </div>
          )}
        </div>
        {stage === 'upload' && (
          <p className="order-3 w-full max-w-2xl text-base leading-relaxed text-[var(--ink)]/65 sm:text-lg">
            Convierte tus momentos favoritos en GIF. Elige un video, ajusta el fragmento y
            personaliza el resultado.
          </p>
        )}
        {(stage === 'edit' || stage === 'converting') && (
          <button
            type="button"
            onClick={resetAll}
            disabled={stage === 'converting'}
            className="focus-ring shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]/75 transition hover:bg-[var(--foam)] disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            Cambiar video
          </button>
        )}
      </header>

      <main
        id="contenido"
        className={
          stage === 'result'
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex flex-1 flex-col gap-6 sm:gap-8'
        }
      >
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
            className="animate-rise flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-white/85 p-3 shadow-[var(--shadow)] backdrop-blur-xl sm:gap-4 sm:rounded-[1.75rem] sm:p-4 xl:p-5"
            aria-labelledby="edit-heading"
          >
            <h2 id="edit-heading" className="sr-only">
              Ajustes y recorte del video
            </h2>

            <div className="grid gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)] xl:gap-5">
              <div className="flex flex-col gap-3 lg:min-h-0">
                <div className="relative flex justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[#101816] shadow-lg">
                  <div className="relative mx-auto w-fit max-w-full">
                    <video
                      ref={videoRef}
                      src={source.url}
                      width={source.width}
                      height={source.height}
                      className="block h-auto w-auto max-h-[min(66vh,760px)] max-w-full object-contain"
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
                        className="pointer-events-none absolute bottom-12 left-1/2 max-w-[90%] -translate-x-1/2 text-center font-semibold"
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

                <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-3 sm:p-4">
                  <TrimSlider
                    duration={source.duration}
                    start={settings.start}
                    end={settings.end}
                    currentTime={currentTime}
                    onChange={(start, end) => patchSettings({ start, end })}
                    onSeek={seekTo}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:h-[calc(100dvh_-_8rem)] lg:min-h-0">
                <div className="settings-scroll min-h-0 space-y-3 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-3 sm:p-4">
                    <h3 className="font-display mb-3 text-lg text-[var(--ink)]">
                      Ajustes del GIF
                    </h3>
                    <EditControls
                      settings={settings}
                      sourceWidth={source.width}
                      sourceHeight={source.height}
                      onChange={patchSettings}
                    />
                  </div>
                </div>

                {stage === 'converting' ? (
                  <div className="sticky bottom-2 z-20 shrink-0 rounded-2xl border border-[var(--line)] bg-white/90 p-3 shadow-lg lg:static">
                    <ProgressBar ratio={progress.ratio} message={progress.message} />
                  </div>
                ) : (
                  <div className="sticky bottom-2 z-20 rounded-2xl border border-white/80 bg-white/90 p-2 shadow-xl backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={handleConvert}
                      className="focus-ring w-full rounded-full bg-[var(--ink)] px-7 py-3.5 text-base font-bold text-[var(--lime)] shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--ink-soft)]"
                    >
                      Convertir a GIF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {stage === 'result' && result && source && (
          <ResultView
            result={result}
            fileName={outputName || source.name.replace(/\.[^.]+$/, '')}
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
