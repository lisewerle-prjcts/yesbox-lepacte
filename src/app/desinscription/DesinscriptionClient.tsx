'use client'

import { useState } from 'react'
import Link from 'next/link'
import { seDesinscrireDesRappels } from '@/app/actions/rappels'
import { t as traduire, type Locale } from '@/lib/i18n/locale'

export default function DesinscriptionClient({ userId, signature, locale }: { userId: string; signature: string; locale: Locale }) {
  const t = (fr: string, en: string) => traduire(locale, fr, en)
  const [status, setStatus] = useState<'idle' | 'saving' | 'fait' | 'erreur'>('idle')
  const [erreur, setErreur] = useState('')

  async function confirmer() {
    setStatus('saving')
    const res = await seDesinscrireDesRappels(userId, signature)
    if (res.error) { setErreur(t(res.error, 'Invalid or expired link.')); setStatus('erreur'); return }
    setStatus('fait')
  }

  return (
    <div className="card p-6 text-center">
      <h1 className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 12 }}>
        {status === 'fait' ? t('C’est noté', 'Done') : t('Ne plus recevoir les rappels', 'Stop receiving reminders')}
      </h1>
      {status === 'fait' ? (
        <p style={{ color: 'var(--muted)' }}>
          {t('Tu ne recevras plus les e-mails de rappel YES BOX. Les e-mails liés à ton compte (étapes de votre parcours, mot de passe…) continuent d’arriver. Tu peux réactiver les rappels à tout moment depuis', 'You will no longer receive YES BOX reminder emails. Emails related to your account (program steps, password…) will still arrive. You can turn reminders back on at any time from')}{' '}
          <Link href="/mon-compte" style={{ color: 'var(--brand)' }}>{t('Mon compte', 'My Account')}</Link>.
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            {t('Tu ne recevras plus les rappels quand votre parcours est en pause, ni les e-mails mensuels autour de votre pacte.', 'You will no longer receive reminders when your program is paused, nor the monthly emails about your pact.')}
          </p>
          {status === 'erreur' && <p role="alert" style={{ color: 'var(--brand-deep)', marginBottom: 16 }}>{erreur}</p>}
          <button onClick={confirmer} disabled={status === 'saving' || !userId || !signature} className="btn-brand">
            {status === 'saving' ? t('Un instant…', 'One moment…') : t('Confirmer', 'Confirm')}
          </button>
        </>
      )}
    </div>
  )
}
