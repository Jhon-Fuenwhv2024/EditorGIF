/**
 * Prueba E2E: sube sample.mp4, convierte a GIF, descarga y guarda capturas.
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sample = join(root, 'test-assets/sample.mp4')
const shots = '/opt/cursor/artifacts/screenshots'
const outGif = join(root, 'test-assets/sample-from-browser.gif')
const base = process.env.APP_URL || 'http://127.0.0.1:4521'

mkdirSync(shots, { recursive: true })
mkdirSync(join(root, 'test-assets'), { recursive: true })

if (!existsSync(sample)) {
  console.error('Falta', sample)
  process.exit(1)
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
})
const page = await context.newPage()
page.setDefaultTimeout(180_000)

page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()))
page.on('pageerror', (err) => console.error('[pageerror]', err.message))

console.log('Abriendo', base)
await page.goto(base, { waitUntil: 'networkidle' })
await page.screenshot({ path: join(shots, '01-upload.png'), fullPage: true })

const input = page.locator('input[type="file"]')
await input.setInputFiles(sample)
await page.getByRole('heading', { name: /Ajusta antes de convertir/i }).waitFor({
  timeout: 30_000,
})
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '02-editor.png'), fullPage: true })

console.log('Convirtiendo…')
await page.getByRole('button', { name: /Convertir a GIF/i }).click()
await page.getByRole('heading', { name: /Tu GIF está listo/i }).waitFor({
  timeout: 180_000,
})
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '03-result.png'), fullPage: true })

const sizeText = await page.locator('text=/KB|MB|B/').first().textContent()
console.log('Tamaño mostrado:', sizeText)

const downloadPromise = page.waitForEvent('download')
await page.getByRole('link', { name: /Descargar GIF/i }).click()
const download = await downloadPromise
await download.saveAs(outGif)
console.log('Descargado →', outGif)

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
await mobile.goto(base, { waitUntil: 'networkidle' })
await mobile.screenshot({ path: join(shots, '04-mobile-upload.png'), fullPage: true })
await mobile.close()

await browser.close()

const { statSync } = await import('node:fs')
const st = statSync(outGif)
console.log(`GIF bytes: ${st.size}`)
if (st.size < 500) {
  console.error('GIF demasiado pequeño')
  process.exit(1)
}
writeFileSync(
  join(root, 'test-assets/smoke-ok.txt'),
  `ok ${st.size} bytes ${new Date().toISOString()}\n`,
)
console.log('SMOKE OK')
