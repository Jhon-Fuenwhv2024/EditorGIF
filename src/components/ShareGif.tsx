import { useState } from 'react'
import { siteUrl } from '../lib/env'

type Props = {
  gifUrl: string
  fileName: string
}

export function ShareGif({ gifUrl, fileName }: Props) {
  const [copied, setCopied] = useState(false)
  const page = `${siteUrl()}/app`
  const text = `GIF hecho con Fotogif — ${page}`

  async function nativeShare() {
    try {
      if (navigator.share) {
        const blob = await fetch(gifUrl).then((r) => r.blob())
        const file = new File([blob], fileName.replace(/\.[^.]+$/, '') + '.gif', {
          type: 'image/gif',
        })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Mi GIF — Fotogif',
            text,
            url: page,
          })
          return
        }
        await navigator.share({ title: 'Mi GIF — Fotogif', text, url: page })
      }
    } catch {
      /* usuario canceló */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(page)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-[var(--ink)]">Compartir</p>
      <div className="flex flex-wrap gap-2">
        {'share' in navigator && (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="focus-ring rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
          >
            Compartir…
          </button>
        )}
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
        >
          WhatsApp
        </a>
        <a
          href={x}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
        >
          X
        </a>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="focus-ring rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
        >
          {copied ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>
    </div>
  )
}
