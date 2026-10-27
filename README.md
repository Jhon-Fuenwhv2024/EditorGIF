# Fotogif

Web app en español para convertir **video a GIF** en el navegador (Vite + React + TypeScript + Tailwind + ffmpeg.wasm). Monetización opcional (AdSense + Stripe Pro), SEO, PWA y páginas legales.

**Sitio de producción:** [https://videogif.trainfit.cloud](https://videogif.trainfit.cloud)

## Arranque local

```bash
cp .env.example .env   # opcional; sin secretos la app funciona en modo gratis
npm install
npm run dev
```

Abre `http://127.0.0.1:4521`.

```bash
npm run build
npm run lint
npm run preview
```

## Qué incluye

- Subida de video o importación por enlace (URL, Google Drive, Dropbox)
- Edición: recorte, ancho, FPS, velocidad, crop, texto, invertir, loop
- GIF con paleta (`palettegen` / `paletteuse`) y progreso
- Plan gratis: anuncios opcionales, marca de agua «hecho con Fotogif», límite de enlace configurable
- Plan Pro (Stripe): sin anuncios, sin marca de agua, límite mayor, portal para cancelar
- Landing, FAQ, SEO, PWA, compartir GIF, privacidad y términos

## Variables de entorno

Documentadas en [`.env.example`](./.env.example). **No subas secretos al repo.**

| Variable | Dónde | Uso |
| --- | --- | --- |
| `VITE_SITE_URL` | Cliente / build | URL pública. **Por defecto:** `https://videogif.trainfit.cloud` (canonical, OG, sitemap, share, Stripe) |
| `VITE_ADSENSE_CLIENT` | Cliente | `ca-pub-…`. Si falta, **no** se cargan anuncios |
| `VITE_ADSENSE_SLOT_CONVERT` | Cliente | Slot durante la conversión |
| `VITE_ADSENSE_SLOT_RESULT` | Cliente | Slot junto al resultado (debajo de la descarga) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Cliente | `pk_test_…` / `pk_live_…` |
| `VITE_PRO_PRICE_LABEL` | Cliente | Texto opcional junto al botón Pro (no inventamos el precio en código) |
| `VITE_FREE_MAX_MB` | Cliente | Límite enlace gratis (por defecto **60**) |
| `VITE_PRO_MAX_MB` | Cliente | Límite enlace Pro (por defecto 100) |
| `STRIPE_SECRET_KEY` | Netlify | `sk_test_…` o `sk_live_…` |
| `STRIPE_PRICE_ID` | Netlify | Price ID de la suscripción que **tú** creas en Stripe |
| `STRIPE_WEBHOOK_SECRET` | Netlify | `whsec_…` del webhook |

Sin AdSense/Stripe la app convierte y descarga igual que antes.

## Cómo recordamos quién es Pro (y por qué)

**Enfoque:** el usuario indica su **email** (el del pago). Se guarda solo en `localStorage`. El servidor consulta **Stripe** (clientes + suscripciones activas/trialing del `STRIPE_PRICE_ID`) vía:

- `POST /api/pro-status` — restaurar / comprobar  
- `POST /api/verify-checkout` — tras Checkout (`session_id`)  
- `POST /api/create-portal-session` — cancelar / gestionar  

**Por qué:** Stripe es la fuente de verdad, no hace falta base de datos, restaurar compra es trivial y el secreto nunca llega al navegador. Limitación: quien conozca el email podría intentar restaurar en otro dispositivo; mitigaciones futuras (magic link / auth) si hace falta.

Webhook `POST /api/stripe-webhook` con `STRIPE_WEBHOOK_SECRET` para auditoría; el estado Pro se resuelve contra Stripe al vuelo.

## Despliegue en Netlify + subdominio `videogif.trainfit.cloud`

El repo incluye [`netlify.toml`](./netlify.toml) con:

- `build`: `npm run build` → `dist`
- `functions`: `netlify/functions` (esbuild)
- redirect SPA `/*` → `/index.html`
- headers **COOP** (`same-origin`) y **COEP** (`credentialless`, compatible con AdSense/Stripe; ffmpeg es single-thread)

### 1) Conectar el sitio en Netlify

1. Netlify → **Add new site** → Import from Git → elige el repo de Fotogif.
2. Confirma build command `npm run build` y publish directory `dist` (ya vienen de `netlify.toml`).
3. **Site configuration → Environment variables** y añade al menos:
   - `VITE_SITE_URL` = `https://videogif.trainfit.cloud`
   - (opcional) claves Stripe / AdSense según `.env.example`
4. **Deploy** el sitio. Anota el dominio temporal tipo `algo.netlify.app`.

### 2) Dominio personalizado + CNAME

1. En Netlify: **Domain management → Add domain alias** → `videogif.trainfit.cloud`.
2. Netlify te mostrará el destino CNAME (suele ser `tu-sitio.netlify.app` o un target que indique el panel).
3. En el DNS de **trainfit.cloud** (donde Jhon gestione el dominio: Cloudflare, Route53, registrador, etc.) crea:

   | Tipo | Nombre / host | Destino / valor |
   | --- | --- | --- |
   | `CNAME` | `videogif` | `TU-SITIO.netlify.app` (el que indique Netlify) |

4. Espera la propagación DNS (minutos u horas). En Netlify, cuando el dominio aparezca como **DNS configured**, activa **HTTPS** (Let’s Encrypt) si no se provisiona solo.
5. Comprueba:
   - https://videogif.trainfit.cloud/
   - https://videogif.trainfit.cloud/app
   - https://videogif.trainfit.cloud/ads.txt
   - https://videogif.trainfit.cloud/sitemap.xml

> Si el DNS exige un registro Apex (`@`) no aplica aquí: `videogif` es un **subdominio**, CNAME es lo correcto.

### 3) Google AdSense

1. Añade `https://videogif.trainfit.cloud` en AdSense.
2. `VITE_ADSENSE_CLIENT` = `ca-pub-…`
3. Crea 2 unidades → `VITE_ADSENSE_SLOT_CONVERT` y `VITE_ADSENSE_SLOT_RESULT`
4. Edita `public/ads.txt`: descomenta la línea y sustituye `pub-XXXXXXXXXXXXXXXX`
5. Sin `VITE_ADSENSE_CLIENT` no se muestra ningún anuncio (ni falsos). El script solo carga tras aceptar cookies.

### 4) Stripe (modo prueba)

1. Dashboard en **Test mode** → producto de **suscripción** → copia **Price ID** → `STRIPE_PRICE_ID` (no inventamos precios en el código).
2. API keys: `sk_test_…` → `STRIPE_SECRET_KEY`; `pk_test_…` → `VITE_STRIPE_PUBLISHABLE_KEY`
3. Activa **Customer portal** (cancelación).
4. Webhook: `https://videogif.trainfit.cloud/api/stripe-webhook` → `whsec_…` → `STRIPE_WEBHOOK_SECRET`
5. Success/cancel URLs las arma el servidor con `VITE_SITE_URL` (por defecto el subdominio de arriba).
6. Prueba en `/app` con tarjeta `4242 4242 4242 4242`.

**Nota sobre checkout de prueba en este entorno de agente:** no hay claves Stripe de Jhon aquí, así que el flujo de pago real no se ejecutó. La UI y las functions quedan listas; valida en Netlify con `sk_test_…`.

## API

| Ruta | Método | Rol |
| --- | --- | --- |
| `/api/fetch-video` | POST | Proxy de descarga por enlace |
| `/api/create-checkout-session` | POST | Stripe Checkout |
| `/api/create-portal-session` | POST | Portal de cliente |
| `/api/pro-status` | POST | ¿Email tiene Pro? |
| `/api/verify-checkout` | POST | Verifica `session_id` |
| `/api/stripe-webhook` | POST | Webhook firmado |

En local, Vite monta las mismas rutas (lee `.env`).

## Licencia

Uso libre para este proyecto; revisa términos de FFmpeg.wasm, Stripe y AdSense antes de producción.
