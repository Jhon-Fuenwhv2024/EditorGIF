/**
 * Smoke: importa un MP4 público por URL y comprueba que llega al editor.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const base = process.env.APP_URL || 'http://127.0.0.1:4521'
const sampleUrl =
  process.env.SAMPLE_URL ||
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
const shots = '/opt/cursor/artifacts/screenshots'
mkdirSync(shots, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.setDefaultTimeout(120_000)
page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()))

await page.goto(base, { waitUntil: 'networkidle' })
await page.screenshot({ path: join(shots, '05-link-upload.png'), fullPage: true })

await page.getByLabel('Enlace del video').fill(sampleUrl)
await page.getByRole('button', { name: 'Importar' }).click()
await page.getByRole('heading', { name: /Ajusta antes de convertir/i }).waitFor({
  timeout: 120_000,
})
await page.waitForTimeout(600)
await page.screenshot({ path: join(shots, '06-link-imported.png'), fullPage: true })

console.log('LINK SMOKE OK')
await browser.close()
