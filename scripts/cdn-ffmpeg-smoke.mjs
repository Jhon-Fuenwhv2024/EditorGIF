/**
 * Verifica conversión real en wrangler pages dev cargando ffmpeg desde CDN.
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const base = process.env.APP_URL || 'http://127.0.0.1:8788'
const sample = join(process.cwd(), 'test-assets/sample.mp4')
const outGif = join(process.cwd(), 'test-assets/cdn-ffmpeg-smoke.gif')
const shots = '/opt/cursor/artifacts/screenshots'
mkdirSync(shots, { recursive: true })
mkdirSync(join(process.cwd(), 'test-assets'), { recursive: true })

if (!existsSync(sample)) {
  console.error('Falta test-assets/sample.mp4')
  process.exit(1)
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
})
const page = await context.newPage()
page.setDefaultTimeout(240_000)
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[browser:error]', msg.text())
})
page.on('pageerror', (err) => console.error('[pageerror]', err.message))

console.log('Abriendo', base)
await page.goto(base + '/app', { waitUntil: 'networkidle' })

const input = page.locator('input[type="file"]')
await input.setInputFiles(sample)
await page.getByRole('heading', { name: /Ajusta antes de convertir/i }).waitFor({
  timeout: 60_000,
})
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '20-cdn-editor.png'), fullPage: true })

console.log('Convirtiendo (CDN ffmpeg)…')
await page.getByRole('button', { name: /Convertir a GIF/i }).click()
await page.getByRole('heading', { name: /Tu GIF está listo/i }).waitFor({
  timeout: 240_000,
})
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '21-cdn-result.png'), fullPage: true })

const downloadPromise = page.waitForEvent('download')
await page.getByRole('link', { name: /Descargar GIF/i }).click()
const download = await downloadPromise
await download.saveAs(outGif)

const { statSync } = await import('node:fs')
const st = statSync(outGif)
console.log(`GIF descargado: ${st.size} bytes`)
if (st.size < 500) {
  console.error('GIF demasiado pequeño')
  process.exit(1)
}

console.log('CDN FFMPEG SMOKE OK')
await browser.close()
