export type VideoSource = {
  file: File
  url: string
  name: string
  duration: number
  width: number
  height: number
}

export type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

export type EditSettings = {
  start: number
  end: number
  width: number
  fps: number
  speed: number
  crop: CropRect | null
  text: string
  textColor: string
  textSize: number
  reverse: boolean
  loop: boolean
}

export type ConversionProgress = {
  ratio: number
  message: string
}

export type GifResult = {
  blob: Blob
  url: string
  size: number
}

export const DEFAULT_SETTINGS: Omit<EditSettings, 'start' | 'end' | 'width'> = {
  fps: 12,
  speed: 1,
  crop: null,
  text: '',
  textColor: '#ffffff',
  textSize: 28,
  reverse: false,
  loop: true,
}

export const ACCEPTED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]

export const ACCEPTED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v']
