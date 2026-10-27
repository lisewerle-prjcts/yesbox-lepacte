'use client'

import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'
import { renvoyerConfirmation } from '@/app/actions/auth'

// Affiché tant que l'adresse n'a pas été vérifiée (cf. lib/adresse-confirmee) :
// l'espace est ouvert, mais l'e-mail de bienvenue et l'invitation du ou de la
// partenaire attendent la confirmation.
export default function BandeauConfirmationAdresse({ email }: { email: string }) {
  const t = useT()
  const [etat, setEtat] = useState<'idle' | 'envoi' | 'envoye'>('idle')
  const [erreur, setErreur] = useState<string | null>(null)

  async function renvoyer() {
    setEtat('envoi')
    setErreur(null)
    const res = await renvoyerConfirmation(email)
    if (res?.error) {
      setErreur(res.error)
      setEtat('idle')
    } else {
      setEtat('envoye')
    }
  }

  return (
    <div className="card mb-6 flex items-start gap-3" style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
      <MailWarning className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#d97706' }} />
      <div className="text-sm text-gray-700 space-y-1">
        <p>
          <strong>{t('Confirme ton adresse e-mail', 'Confirm your email address')}</strong>{' '}
          {t(`: clique sur le lien envoyé à ${email} (pense à regarder dans tes spams).`, `: click the link sent to ${email} (check your spam folder too).`)}
        </p>
        {etat === 'envoye' ? (
          <p className="text-green-700">{t('E-mail renvoyé ! Il arrive en général en moins d’une minute.', 'Email resent! It usually arrives within a minute.')}</p>
        ) : (
          <button type="button" onClick={renvoyer} disabled={etat === 'envoi'} className="text-magenta font-semibold hover:underline disabled:opacity-50">
            {etat === 'envoi' ? t('Envoi…', 'Sending…') : t('Renvoyer l’e-mail', 'Resend the email')}
          </button>
        )}
        {erreur && <p className="text-red-700">{erreur}</p>}
      </div>
    </div>
  )
}
