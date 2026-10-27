import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const EMAIL_KEY = 'fotogif_pro_email'
const CONSENT_KEY = 'fotogif_cookie_consent'

type ProContextValue = {
  email: string | null
  isPro: boolean
  loading: boolean
  setEmailAndRefresh: (email: string | null) => Promise<void>
  refresh: () => Promise<void>
  cookieConsent: 'accepted' | 'rejected' | null
  setCookieConsent: (value: 'accepted' | 'rejected') => void
}

const ProContext = createContext<ProContextValue | null>(null)

async function fetchProStatus(email: string): Promise<boolean> {
  const res = await fetch('/api/pro-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { isPro?: boolean }
  return Boolean(data.isPro)
}

export function ProProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(EMAIL_KEY)
    } catch {
      return null
    }
  })
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(Boolean(email))
  const [cookieConsent, setCookieConsentState] = useState<
    'accepted' | 'rejected' | null
  >(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY)
      if (v === 'accepted' || v === 'rejected') return v
    } catch {
      /* ignore */
    }
    return null
  })

  const refresh = useCallback(async () => {
    if (!email) {
      setIsPro(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const pro = await fetchProStatus(email)
      setIsPro(pro)
    } catch {
      setIsPro(false)
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setEmailAndRefresh = useCallback(async (next: string | null) => {
    const normalized = next?.trim().toLowerCase() || null
    setEmail(normalized)
    try {
      if (normalized) localStorage.setItem(EMAIL_KEY, normalized)
      else localStorage.removeItem(EMAIL_KEY)
    } catch {
      /* ignore */
    }
    if (!normalized) {
      setIsPro(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const pro = await fetchProStatus(normalized)
      setIsPro(pro)
    } catch {
      setIsPro(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const setCookieConsent = useCallback((value: 'accepted' | 'rejected') => {
    setCookieConsentState(value)
    try {
      localStorage.setItem(CONSENT_KEY, value)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      email,
      isPro,
      loading,
      setEmailAndRefresh,
      refresh,
      cookieConsent,
      setCookieConsent,
    }),
    [
      email,
      isPro,
      loading,
      setEmailAndRefresh,
      refresh,
      cookieConsent,
      setCookieConsent,
    ],
  )

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext)
  if (!ctx) throw new Error('usePro debe usarse dentro de ProProvider')
  return ctx
}
