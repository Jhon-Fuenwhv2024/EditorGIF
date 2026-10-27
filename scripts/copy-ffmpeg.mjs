/**
 * Ya no se copia ffmpeg-core a public/ (Cloudflare Pages limita a 25 MiB).
 * El core se carga desde CDN (ver VITE_FFMPEG_BASE_URL / src/lib/ffmpeg.ts).
 */
console.log(
  '[ffmpeg] Core se carga desde CDN en runtime; no se copia wasm a public/dist.',
)
