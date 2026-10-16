'use client'

import Link from 'next/link'
import { useT } from '@/components/i18n/LocaleContext'

// Case à cocher avant tout paiement Stripe Checkout : la personne demande
// l'accès immédiat aux modules et renonce à son droit de rétractation de
// 14 jours dès cet accès (contenu numérique, art. L221-28 du Code de la
// consommation).
export default function CaseRetractation({ coche, onChange, clair = false }: { coche: boolean; onChange: (v: boolean) => void; clair?: boolean }) {
  const t = useT()
  const couleur = clair ? 'rgba(255,255,255,.92)' : 'var(--ink-2)'
  return (
    <label className="flex gap-2 items-start mb-4 cursor-pointer" style={{ fontSize: 12.5, lineHeight: 1.5, color: couleur, textAlign: 'left' }}>
      <input type="checkbox" checked={coche} onChange={e => onChange(e.target.checked)} className="mt-0.5 flex-shrink-0" />
      <span>
        {t(
          'Je demande l’accès immédiat aux modules et je reconnais perdre mon droit de rétractation de 14 jours dès que cet accès m’est ouvert.',
          'I request immediate access to the modules and acknowledge that I lose my 14-day right of withdrawal as soon as this access is granted.'
        )}{' '}
        <Link href="/mentions-legales" target="_blank" style={{ color: couleur, textDecoration: 'underline' }}>{t('Conditions', 'Terms')}</Link>
      </span>
    </label>
  )
}
