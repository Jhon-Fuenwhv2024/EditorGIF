/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_ADSENSE_CLIENT?: string
  readonly VITE_ADSENSE_SLOT_CONVERT?: string
  readonly VITE_ADSENSE_SLOT_RESULT?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_PRO_PRICE_LABEL?: string
  readonly VITE_FREE_MAX_MB?: string
  readonly VITE_PRO_MAX_MB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
