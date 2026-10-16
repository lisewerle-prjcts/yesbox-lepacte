'use client'

import Link from 'next/link'
import { useT } from '@/components/i18n/LocaleContext'

// Case à cocher avant tout paiement Stripe Checkout : acceptation des CGV.
// Les CGV (article 5) précisent qu'en la cochant, la personne demande
// l'accès immédiat aux modules et renonce à son droit de rétractation de
// 14 jours dès cet accès (art. L221-28 du Code de la consommation).
export default function CaseRetractation({ coche, onChange, clair = false }: { coche: boolean; onChange: (v: boolean) => void; clair?: boolean }) {
  const t = useT()
  const couleur = clair ? 'rgba(255,255,255,.92)' : 'var(--ink-2)'
  return (
    <label className="flex gap-2 items-start mb-4 cursor-pointer" style={{ fontSize: 12.5, lineHeight: 1.5, color: couleur, textAlign: 'left' }}>
      <input type="checkbox" checked={coche} onChange={e => onChange(e.target.checked)} className="mt-0.5 flex-shrink-0" />
      <span>
        {t('J’ai lu et j’accepte les', 'I have read and accept the')}{' '}
        <Link href="/cgv" target="_blank" style={{ color: couleur, textDecoration: 'underline' }}>{t('CGV', 'terms of sale')}</Link>
      </span>
    </label>
  )
}
