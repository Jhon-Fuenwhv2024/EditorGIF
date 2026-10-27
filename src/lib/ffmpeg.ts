import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { ConversionProgress, EditSettings } from '../types'

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%')
}

function buildVideoFilters(
  settings: EditSettings,
  sourceHeight: number,
  watermark: boolean,
): string {
  const filters: string[] = []

  if (settings.crop) {
    const { x, y, width, height } = settings.crop
    filters.push(
      `crop=${Math.max(2, Math.floor(width))}:${Math.max(2, Math.floor(height))}:${Math.max(0, Math.floor(x))}:${Math.max(0, Math.floor(y))}`,
    )
  }

  const evenWidth = Math.max(2, Math.floor(settings.width / 2) * 2)
  filters.push(`scale=${evenWidth}:-2:flags=lanczos`)

  const pts = settings.speed > 0 ? 1 / settings.speed : 1
  filters.push(`setpts=${pts}*PTS`)

  if (settings.reverse) {
    filters.push('reverse')
  }

  filters.push(`fps=${Math.max(1, Math.min(30, Math.round(settings.fps)))}`)

  if (settings.text.trim()) {
    const fontSize = Math.max(10, Math.round(settings.textSize))
    const color = settings.textColor.replace('#', '')
    const safe = escapeDrawtext(settings.text.trim())
    filters.push(
      `drawtext=fontfile=/font.ttf:text='${safe}':fontsize=${fontSize}:fontcolor=0x${color}:borderw=2:bordercolor=black@0.55:x=(w-text_w)/2:y=h-th-${Math.max(8, Math.round(sourceHeight * 0.03))}`,
    )
  }

  if (watermark) {
    // Marca pequeña en esquina (plan gratis)
    filters.push(
      `drawtext=fontfile=/font.ttf:text='${escapeDrawtext('hecho con Fotogif')}':fontsize=14:fontcolor=white@0.75:borderw=1:bordercolor=black@0.35:x=w-tw-10:y=h-th-8`,
    )
  }

  return filters.join(',')
}

export async function getFFmpeg(
  onLog?: (message: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', ({ message }) => {
      onLog?.(message)
    })

    const base = `${window.location.origin}/ffmpeg`
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  try {
    return await loadPromise
  } catch (error) {
    loadPromise = null
    throw error
  }
}

export async function convertToGif(
  file: File,
  settings: EditSettings,
  sourceHeight: number,
  onProgress: (progress: ConversionProgress) => void,
  options: { watermark?: boolean } = {},
): Promise<Blob> {
  const ffmpeg = await getFFmpeg()
  const watermark = Boolean(options.watermark)

  const inputName = 'input' + getExtension(file.name)
  const paletteName = 'palette.png'
  const outputName = 'output.gif'

  onProgress({ ratio: 0.02, message: 'Cargando motor FFmpeg…' })

  await ffmpeg.writeFile(inputName, await fetchFile(file))

  if (settings.text.trim() || watermark) {
    await ffmpeg.writeFile(
      'font.ttf',
      await fetchFile(`${window.location.origin}/fonts/DejaVuSans.ttf`),
    )
  }

  const vf = buildVideoFilters(settings, sourceHeight, watermark)
  const start = Math.max(0, settings.start)
  const end = Math.max(start + 0.1, settings.end)
  const duration = (end - start) / Math.max(0.1, settings.speed)

  const progressHandler = ({ progress }: { progress: number }) => {
    // FFmpeg reports 0–1 per pass; map to overall progress
    const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
    onProgress({
      ratio: 0.08 + clamped * 0.82,
      message: 'Generando paleta y fotogramas…',
    })
  }
  ffmpeg.on('progress', progressHandler)

  try {
    onProgress({ ratio: 0.08, message: 'Creando paleta de colores…' })

    // Two-pass high-quality GIF: palettegen + paletteuse
    const commonSeek = ['-ss', String(start), '-t', String(end - start)]

    await ffmpeg.exec([
      ...commonSeek,
      '-i',
      inputName,
      '-vf',
      `${vf},palettegen=stats_mode=diff`,
      '-y',
      paletteName,
    ])

    onProgress({ ratio: 0.55, message: 'Aplicando paleta al GIF…' })

    const loopFlag = settings.loop ? '0' : '-1'
    await ffmpeg.exec([
      ...commonSeek,
      '-i',
      inputName,
      '-i',
      paletteName,
      '-lavfi',
      `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      '-loop',
      loopFlag,
      '-y',
      outputName,
    ])

    onProgress({ ratio: 0.95, message: 'Empaquetando GIF…' })

    const data = await ffmpeg.readFile(outputName)
    const bytes =
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : new Uint8Array(data)

    onProgress({ ratio: 1, message: 'Listo' })

    // Rough duration check for empty output
    if (bytes.byteLength < 100) {
      throw new Error('El GIF generado está vacío. Prueba otro recorte o ajustes.')
    }

    void duration
    return new Blob([bytes], { type: 'image/gif' })
  } finally {
    ffmpeg.off('progress', progressHandler)
    try {
      await ffmpeg.deleteFile(inputName)
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile(paletteName)
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile(outputName)
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile('font.ttf')
    } catch {
      /* ignore */
    }
  }
}

function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  if (i === -1) return '.mp4'
  return name.slice(i).toLowerCase() || '.mp4'
}

export function estimateOutputDuration(settings: EditSettings): number {
  const span = Math.max(0, settings.end - settings.start)
  return span / Math.max(0.1, settings.speed)
}
