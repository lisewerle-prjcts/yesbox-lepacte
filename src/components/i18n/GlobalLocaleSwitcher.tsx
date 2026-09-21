'use client'

import { usePathname } from 'next/navigation'
import { useLocale } from './LocaleContext'

/** Sélecteur de langue flottant, visible sur tout le site sauf le back-office admin. */
export default function GlobalLocaleSwitcher() {
  const { locale, setLocale } = useLocale()
  const pathname = usePathname()

  if (pathname?.startsWith('/admin')) return null

  return (
    <div
      role="group"
      aria-label="Langue / Language"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 200,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        borderRadius: 999,
        background: 'var(--dark)',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-geist-mono)',
      }}
    >
      {(['fr', 'en'] as const).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.06em',
            padding: '6px 12px',
            borderRadius: 999,
            color: locale === l ? 'var(--dark)' : 'rgba(255,255,255,.6)',
            background: locale === l ? 'white' : 'transparent',
            transition: 'all .15s',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
