/**
 * Cloudflare Pages rechaza archivos > 25 MiB.
 * Falla el build si algún archivo en dist/ supera el límite.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dist = join(root, 'dist')
const LIMIT = 25 * 1024 * 1024

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

let files
try {
  files = walk(dist)
} catch {
  console.error('[check-dist-size] No existe dist/. Ejecuta vite build antes.')
  process.exit(1)
}

const oversized = []
for (const file of files) {
  const size = statSync(file).size
  if (size > LIMIT) {
    oversized.push({
      path: relative(root, file),
      mb: (size / (1024 * 1024)).toFixed(2),
    })
  }
}

if (oversized.length) {
  console.error('[check-dist-size] Archivos que superan 25 MiB (límite Cloudflare Pages):')
  for (const item of oversized) {
    console.error(`  - ${item.path} (${item.mb} MiB)`)
  }
  console.error(
    'No copies ffmpeg-core.wasm a dist; cárgalo desde CDN (VITE_FFMPEG_BASE_URL).',
  )
  process.exit(1)
}

const largest = files
  .map((f) => ({ path: relative(root, f), size: statSync(f).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)

console.log('[check-dist-size] OK — ningún archivo en dist/ supera 25 MiB')
console.log('[check-dist-size] Top 5 por tamaño:')
for (const item of largest) {
  console.log(`  - ${item.path} (${(item.size / 1024).toFixed(1)} KiB)`)
}
