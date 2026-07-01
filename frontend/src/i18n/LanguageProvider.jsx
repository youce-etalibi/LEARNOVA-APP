import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { LANGUAGES, translations } from './translations'

const STORAGE_KEY = 'learnova-lang'
const LanguageContext = createContext(null)

function readInitial() {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)
  if (saved && translations[saved]) return saved
  return 'fr'
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readInitial)

  const meta = useMemo(
    () => LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0],
    [lang],
  )

  // Keep <html> lang/dir in sync so the whole app mirrors for Arabic.
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('lang', lang)
    html.setAttribute('dir', meta.dir)
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang, meta.dir])

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.fr[key] ?? key,
    [lang],
  )

  const value = useMemo(
    () => ({ lang, setLang, t, dir: meta.dir, languages: LANGUAGES, current: meta }),
    [lang, t, meta],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider')
  return ctx
}
