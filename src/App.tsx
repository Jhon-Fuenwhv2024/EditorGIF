import { Navigate, Route, Routes } from 'react-router-dom'
import { CookieConsent } from './components/CookieConsent'
import { ConverterPage } from './pages/ConverterPage'
import { LandingPage } from './pages/LandingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<ConverterPage />} />
        <Route path="/privacidad" element={<PrivacyPage />} />
        <Route path="/terminos" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </>
  )
}
