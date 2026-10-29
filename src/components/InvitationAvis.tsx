'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'

// Demande d'avis une fois le pacte signé (page Notre Pacte, fin du module
// Pacte), tant que la personne n'en a pas laissé.
export default function InvitationAvis() {
  const t = useT()
  return (
    <div className="surface text-center" style={{ maxWidth: 440, margin: '28px auto 0', padding: '20px 24px' }}>
      <p className="flex items-center justify-center gap-0.5 mb-2" style={{ color: 'var(--brand)' }} aria-hidden>
        {[1, 2, 3, 4, 5].map(n => <Star key={n} className="w-4 h-4" fill="currentColor" />)}
      </p>
      <p className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--ink)' }}>
        {t('Que vous a apporté la YES BOX ?', 'What has YES BOX brought you?')}
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 14px' }}>
        {t('Laissez votre avis : une fois publié, vous recevez un code de 10 € de réduction.', 'Leave a review: once it is published, you get a €10 discount code.')}
      </p>
      <Link href="/avis" className="btn-brand text-sm">{t('Donner mon avis', 'Leave my review')}</Link>
    </div>
  )
}
