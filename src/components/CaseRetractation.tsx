'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/i18n/LocaleContext'

// Cases à cocher avant tout paiement Stripe Checkout : acceptation des CGV,
// puis demande d'accès immédiat aux modules avec renonciation au droit de
// rétractation de 14 jours dès cet accès (art. L221-28 du Code de la
// consommation, CGV article 5). onChange reçoit true quand les deux sont
// cochées.
export default function CaseRetractation({ onChange, clair = false }: { onChange: (v: boolean) => void; clair?: boolean }) {
  const t = useT()
  const [cgv, setCgv] = useState(false)
  const [renonciation, setRenonciation] = useState(false)
  const couleur = clair ? 'rgba(255,255,255,.92)' : 'var(--ink-2)'
  const style = { fontSize: 12.5, lineHeight: 1.5, color: couleur, textAlign: 'left' as const }

  return (
    <div className="mb-4 space-y-2">
      <label className="flex gap-2 items-start cursor-pointer" style={style}>
        <input type="checkbox" checked={cgv} onChange={e => { setCgv(e.target.checked); onChange(e.target.checked && renonciation) }} className="mt-0.5 shrink-0" />
        <span>
          {t('J’ai lu et j’accepte les', 'I have read and accept the')}{' '}
          <Link href="/cgv" target="_blank" style={{ color: couleur, textDecoration: 'underline' }}>{t('CGV', 'terms of sale')}</Link>
        </span>
      </label>
      <label className="flex gap-2 items-start cursor-pointer" style={style}>
        <input type="checkbox" checked={renonciation} onChange={e => { setRenonciation(e.target.checked); onChange(cgv && e.target.checked) }} className="mt-0.5 shrink-0" />
        <span>{t('Je demande l’accès immédiat et renonce à mon droit de rétractation dès cet accès', 'I request immediate access and waive my right of withdrawal as of that access')}</span>
      </label>
    </div>
  )
}
