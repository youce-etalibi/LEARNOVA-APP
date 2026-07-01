import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useI18n } from '../../../i18n/LanguageProvider'
import './LanguageSwitcher.css'

export default function LanguageSwitcher() {
  const { lang, setLang, languages, current, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (code) => {
    setLang(code)
    setOpen(false)
  }

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className={`lang__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('navbar.language')}
      >
        <Icon icon={current.flag} className="lang__flag" />
        <span className="lang__code">{lang.toUpperCase()}</span>
        <Icon icon="solar:alt-arrow-down-linear" className="lang__caret" />
      </button>

      <div className={`lang__menu ${open ? 'is-open' : ''}`} role="listbox">
        <p className="lang__title">
          <Icon icon="solar:globus-bold-duotone" />
          {t('navbar.language')}
        </p>
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            role="option"
            aria-selected={l.code === lang}
            className={`lang__item ${l.code === lang ? 'is-active' : ''}`}
            onClick={() => choose(l.code)}
          >
            <Icon icon={l.flag} className="lang__flag" />
            <span className="lang__native">{l.native}</span>
            <span className="lang__label">{l.label}</span>
            {l.code === lang && <Icon icon="solar:check-circle-bold" className="lang__check" />}
          </button>
        ))}
      </div>
    </div>
  )
}
