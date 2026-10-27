# Fotogif

Web app en español para convertir **video a GIF** en el navegador (Vite + React + TypeScript + Tailwind + ffmpeg.wasm). Monetización opcional (AdSense + Stripe Pro), SEO, PWA y páginas legales.

**Sitio de producción:** [https://videogif.trainfit.cloud](https://videogif.trainfit.cloud)  
**Hosting:** Cloudflare Pages (+ Pages Functions en Workers)

## Arranque local

```bash
cp .env.example .env   # opcional; sin secretos la app funciona en modo gratis
npm install
npm run dev            # Vite en http://127.0.0.1:4521 (API vía middleware)
```

Simular Cloudflare Pages (build + Functions + headers):

```bash
npm run pages:dev      # http://127.0.0.1:8788
```

```bash
npm run build
npm run lint
```

## Qué incluye

- Subida de video o importación por enlace (URL, Google Drive, Dropbox)
- Edición: recorte, ancho, FPS, velocidad, crop, texto, invertir, loop
- GIF con paleta (`palettegen` / `paletteuse`) y progreso
- Plan gratis: anuncios opcionales, marca de agua «hecho con Fotogif», ~60 MB por enlace
- Plan Pro (Stripe): sin anuncios, sin marca de agua, límite mayor, portal para cancelar
- Landing, FAQ, SEO, PWA, compartir GIF, privacidad y términos

## Variables de entorno

Documentadas en [`.env.example`](./.env.example). **No subas secretos al repo.**

| Variable | Dónde | Uso |
| --- | --- | --- |
| `VITE_SITE_URL` | Build (Pages) | Default `https://videogif.trainfit.cloud` |
| `VITE_ADSENSE_CLIENT` | Build | `ca-pub-…`. Si falta, no hay anuncios |
| `VITE_ADSENSE_SLOT_CONVERT` / `VITE_ADSENSE_SLOT_RESULT` | Build | Slots |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Build | `pk_test_…` / `pk_live_…` |
| `VITE_PRO_PRICE_LABEL` | Build | Texto opcional (no hardcodeamos precio) |
| `VITE_FREE_MAX_MB` / `VITE_PRO_MAX_MB` | Build | Default 60 / 100 |
| `STRIPE_SECRET_KEY` | Runtime (Pages) | `sk_test_…` / `sk_live_…` |
| `STRIPE_PRICE_ID` | Runtime | Price ID de tu suscripción en Stripe |
| `STRIPE_WEBHOOK_SECRET` | Runtime | `whsec_…` |

Las `VITE_*` deben estar disponibles en el **build**. Las `STRIPE_*` en el **runtime** de Functions (Production/Preview).

## Cómo recordamos quién es Pro

Email en `localStorage` + verificación server-side contra Stripe (`/api/pro-status`, `/api/verify-checkout`, portal). Stripe es la fuente de verdad; no hay base de datos. El webhook `/api/stripe-webhook` valida la firma con **WebCrypto** (`constructEventAsync`).

## Despliegue en Cloudflare Pages + `videogif.trainfit.cloud`

Config del repo:

- Build: `npm run build`
- Salida: `dist`
- Functions: carpeta `functions/` (Workers)
- Headers COOP/COEP: `public/_headers`
- SPA fallback: `public/_redirects`
- `wrangler.toml` con `pages_build_output_dir = "dist"`

### 1) Conectar GitHub

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Elige el repo `EditorGIF` (o el de Fotogif).
3. Ajustes de build:
   - **Framework preset:** Vite (o None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (raíz del repo)
4. Guarda y lanza el primer deploy.

### 2) Variables de entorno

En el proyecto Pages → **Settings** → **Environment variables**:

1. **Production** (y Preview si quieres):
   - `VITE_SITE_URL` = `https://videogif.trainfit.cloud`
   - resto de `VITE_*` que uses (AdSense, etc.)
2. Secretos de runtime (Production/Preview):
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
3. **Redeploy** tras cambiar `VITE_*` (hacen falta en el build).

CLI opcional:

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name=fotogif
```

### 3) Dominio personalizado (DNS ya en Cloudflare)

El DNS de `trainfit.cloud` está en Cloudflare. Para el subdominio:

1. Pages → tu proyecto → **Custom domains** → **Set up a custom domain**.
2. Añade `videogif.trainfit.cloud`.
3. Como la zona ya está en Cloudflare, suele crearse/ajustarse solo un registro:

   | Tipo | Nombre | Destino |
   | --- | --- | --- |
   | `CNAME` | `videogif` | `tu-proyecto.pages.dev` (el que indique el panel) |

4. **Si ya existe un CNAME `videogif`** (p. ej. apuntando a Netlify u otro host):
   - Entra en **DNS** de la zona `trainfit.cloud`.
   - Edita el registro `videogif` y cámbialo al target de **Pages** que muestre Cloudflare (o elimina el viejo y deja que Custom domains lo recree).
   - Proxy naranja (Proxied) está bien para Pages en la misma cuenta.
5. Espera a que el dominio quede **Active** con HTTPS.
6. Comprueba:
   - https://videogif.trainfit.cloud/
   - https://videogif.trainfit.cloud/app
   - https://videogif.trainfit.cloud/api/pro-status (POST)
   - https://videogif.trainfit.cloud/ads.txt

### 4) AdSense

Igual que antes: sitio `https://videogif.trainfit.cloud`, `VITE_ADSENSE_CLIENT`, slots, y `public/ads.txt`.

### 5) Stripe

1. Price ID de suscripción → `STRIPE_PRICE_ID` (no inventamos el precio en código).
2. Keys test/live → `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY`.
3. Customer Portal activado.
4. Webhook: `https://videogif.trainfit.cloud/api/stripe-webhook` → `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
5. Success/cancel los arma el servidor con `VITE_SITE_URL`.

## API (Cloudflare Pages Functions)

| Ruta | Archivo | Rol |
| --- | --- | --- |
| `/api/fetch-video` | `functions/api/fetch-video.ts` | Proxy de enlaces |
| `/api/create-checkout-session` | `functions/api/create-checkout-session.ts` | Checkout |
| `/api/create-portal-session` | `functions/api/create-portal-session.ts` | Portal / cancelar |
| `/api/pro-status` | `functions/api/pro-status.ts` | ¿Es Pro? |
| `/api/verify-checkout` | `functions/api/verify-checkout.ts` | Tras pagar |
| `/api/stripe-webhook` | `functions/api/stripe-webhook.ts` | Webhook (WebCrypto) |

Lógica compartida en `shared/api-handlers.ts` y `shared/stripe-server.ts` (Stripe con `createFetchHttpClient`).

## Licencia

Uso libre para este proyecto; revisa términos de FFmpeg.wasm, Stripe y AdSense antes de producción.
