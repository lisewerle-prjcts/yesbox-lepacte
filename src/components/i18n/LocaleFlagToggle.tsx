'use client'

import { useLocale } from './LocaleContext'

/** Drapeaux en SVG : les émojis drapeaux ne s'affichent pas sous Windows. */
function DrapeauFR() {
  return (
    <svg viewBox="0 0 3 2" width="24" height="16" aria-hidden="true" style={{ display: 'block' }}>
      <rect width="1" height="2" x="0" fill="#002395" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ED2939" />
    </svg>
  )
}

function DrapeauUK() {
  return (
    <svg viewBox="0 0 60 30" width="24" height="16" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
      <clipPath id="drapeau-uk-clip"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#drapeau-uk-clip)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}

/**
 * Bascule de langue en drapeau pour l'en-tête. Affiche le drapeau de l'autre
 * langue ; même comportement que le sélecteur FR/EN (cookie + profil + e-mails).
 */
export default function LocaleFlagToggle() {
  const { locale, setLocale } = useLocale()
  const cible = locale === 'fr' ? 'en' : 'fr'
  const libelle = cible === 'en' ? 'Switch to English' : 'Passer en français'

  return (
    <button
      type="button"
      onClick={() => setLocale(cible)}
      aria-label={libelle}
      title={libelle}
      className="p-1 rounded transition-opacity hover:opacity-80"
    >
      <span style={{ display: 'block', borderRadius: 3, overflow: 'hidden', boxShadow: '0 0 0 1px var(--line)' }}>
        {cible === 'en' ? <DrapeauUK /> : <DrapeauFR />}
      </span>
    </button>
  )
}
