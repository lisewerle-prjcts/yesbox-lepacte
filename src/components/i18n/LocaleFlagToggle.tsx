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

function DrapeauUS() {
  // 13 bandes et un canton bleu ; les étoiles sont simplifiées (taille d'icône).
  const bandes = Array.from({ length: 13 }, (_, i) => i)
  const etoiles: [number, number][] = []
  for (let l = 0; l < 5; l++) for (let c = 0; c < (l % 2 ? 5 : 6); c++) etoiles.push([l % 2 ? 3.8 + c * 3.8 : 1.9 + c * 3.8, 1.6 + l * 3])
  return (
    <svg viewBox="0 0 57 30" width="24" height="16" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
      {bandes.map(i => <rect key={i} y={(i * 30) / 13} width="57" height={30 / 13 + 0.05} fill={i % 2 ? '#ffffff' : '#B22234'} />)}
      <rect width="22.8" height={(30 * 7) / 13} fill="#3C3B6E" />
      {etoiles.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.75" fill="#ffffff" />)}
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
        {cible === 'en' ? <DrapeauUS /> : <DrapeauFR />}
      </span>
    </button>
  )
}
