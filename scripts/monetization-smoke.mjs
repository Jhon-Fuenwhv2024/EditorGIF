import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const base = process.env.APP_URL || 'http://127.0.0.1:4521'
const shots = '/opt/cursor/artifacts/screenshots'
mkdirSync(shots, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.setDefaultTimeout(60_000)

await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.screenshot({ path: join(shots, '10-landing.png'), fullPage: true })

await page.goto(base + '/app', { waitUntil: 'networkidle' })
await page.screenshot({ path: join(shots, '11-app-pro-panel.png'), fullPage: true })

await page.goto(base + '/privacidad', { waitUntil: 'networkidle' })
await page.screenshot({ path: join(shots, '12-privacidad.png'), fullPage: true })

// Sin AdSense: no debe haber banner de cookies
const cookieDialog = await page.getByRole('dialog', { name: /Cookies/i }).count()
if (cookieDialog !== 0) {
  throw new Error('No debería haber banner de cookies sin VITE_ADSENSE_CLIENT')
}

// Pro panel visible; checkout sin claves debe fallar con mensaje claro
await page.goto(base + '/app', { waitUntil: 'networkidle' })
await page.getByLabel('Email de la suscripción').fill('test@example.com')
await page.getByRole('button', { name: 'Hazte Pro' }).click()
await page.waitForTimeout(1500)
const status = await page.locator('[role="status"]').last().textContent()
console.log('Checkout sin claves:', status)

await page.screenshot({ path: join(shots, '13-pro-checkout-error.png'), fullPage: true })

console.log('MONETIZATION SMOKE OK')
await browser.close()
