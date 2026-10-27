import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdUnit } from '../components/AdUnit'
import { CropOverlay } from '../components/CropOverlay'
import { EditControls } from '../components/EditControls'
import { ProPanel } from '../components/ProPanel'
import { ProgressBar } from '../components/ProgressBar'
import { ResultView } from '../components/ResultView'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { TrimSlider } from '../components/TrimSlider'
import { UploadZone } from '../components/UploadZone'
import { freeMaxMb, maxBytesForPlan, proMaxMb } from '../lib/env'
import { convertToGif, estimateOutputDuration } from '../lib/ffmpeg'
import { formatTime } from '../lib/format'
import { usePro } from '../lib/pro'
import {
  DEFAULT_SETTINGS,
  type ConversionProgress,
  type EditSettings,
  type GifResult,
  type VideoSource,
} from '../types'

type Stage = 'upload' | 'edit' | 'converting' | 'result'

function suggestWidth(sourceWidth: number): number {
  return Math.min(480, Math.max(160, Math.round(sourceWidth / 2 / 2) * 2))
}

export function ConverterPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPro, setEmailAndRefresh } = usePro()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null)

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

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    if (checkout === 'cancel') {
      setCheckoutNote('Checkout cancelado. Puedes intentarlo de nuevo cuando quieras.')
      setSearchParams({}, { replace: true })
      return
    }
    if (checkout === 'success' && sessionId) {
      void (async () => {
        try {
          const res = await fetch('/api/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          })
          const data = (await res.json()) as {
            email?: string
            isPro?: boolean
            error?: string
          }
          if (!res.ok) throw new Error(data.error || 'No se pudo verificar el pago')
          if (data.email) await setEmailAndRefresh(data.email)
          setCheckoutNote(
            data.isPro
              ? 'Pago confirmado. Fotogif Pro está activo en este navegador.'
              : 'Pago recibido. Si Pro no aparece, usa «Restaurar compra» con tu email.',
          )
        } catch (err) {
          setCheckoutNote(
            err instanceof Error
              ? err.message
              : 'No se pudo verificar el checkout. Usa restaurar compra con tu email.',
          )
        } finally {
          setSearchParams({}, { replace: true })
        }
      })()
    }
  }, [searchParams, setSearchParams, setEmailAndRefresh])

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
        { watermark: !isPro },
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
  const linkLimitMb = isPro ? proMaxMb() : freeMaxMb()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <SiteHeader />

      <main id="contenido" className="flex flex-1 flex-col gap-8">
        {checkoutNote && (
          <p
            role="status"
            className="rounded-2xl border border-[var(--lime)]/40 bg-[var(--lime)]/15 px-4 py-3 text-sm font-medium text-[var(--ink)]"
          >
            {checkoutNote}
          </p>
        )}

        <ProPanel />

        {stage === 'upload' && (
          <>
            <div>
              <h1 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">
                Convertir video a GIF
              </h1>
              <p className="mt-2 max-w-xl text-lg text-[var(--ink)]/75">
                Sube un archivo o pega un enlace (Drive / Dropbox / URL). Límite por
                enlace: ~{linkLimitMb} MB
                {isPro ? ' (Pro)' : ` (gratis; Pro hasta ~${proMaxMb()} MB)`}.
              </p>
            </div>
            <UploadZone
              onFile={loadVideo}
              disabled={loadingMeta}
              maxBytes={maxBytesForPlan(isPro)}
              maxMbLabel={linkLimitMb}
            />
          </>
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
                  {!isPro && ' · marca de agua en el plan gratis'}
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
              <div className="space-y-4">
                <ProgressBar ratio={progress.ratio} message={progress.message} />
                <AdUnit slot="convert" />
              </div>
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
            showAd={!isPro}
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

      <SiteFooter />
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
