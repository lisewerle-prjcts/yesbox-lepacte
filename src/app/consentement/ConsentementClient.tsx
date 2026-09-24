'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import { enregistrerConsentement } from '@/app/actions/compte'
import { deconnexion } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useT()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? t('Enregistrement…', 'Saving…') : t('Continuer', 'Continue')}
    </button>
  )
}

export default function ConsentementClient({ prenom }: { prenom: string }) {
  const t = useT()
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await enregistrerConsentement(formData)
    if (result?.error) {
      setError(result.error)
      return
    }
    window.location.href = '/tableau-de-bord'
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            {prenom ? t(`Bonjour ${prenom}`, `Hi ${prenom}`) : t('Bonjour', 'Hi')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t(
              'Nous avons mis à jour notre politique de confidentialité. Pour continuer le programme, nous avons besoin de ton accord.',
              'We have updated our privacy policy. To continue the program, we need your agreement.',
            )}
          </p>
        </div>

        <div className="card">
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleAction} className="space-y-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="age_minimum" required className="mt-1 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                <EditableText id="inscription.age">Je certifie avoir 15 ans ou plus.</EditableText>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="consentement_sensible" required className="mt-1 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                <EditableText id="inscription.consentement" multiline>J&apos;accepte que mes réponses aux modules, qui peuvent concerner ma vie intime ou mes convictions religieuses, soient enregistrées pour le fonctionnement du programme. Elles ne sont visibles que par mon couple, et je peux retirer ce consentement à tout moment en supprimant mon compte.</EditableText>{' '}
                <Link href="/confidentialite" target="_blank" className="text-magenta hover:underline">{t('Politique de confidentialité', 'Privacy policy')}</Link>
              </span>
            </label>
            <SubmitButton />
          </form>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6 space-y-2">
          <p>
            {t('Tu ne souhaites pas donner ton accord ?', "Don't want to agree?")}{' '}
            <Link href="/mon-compte" className="text-magenta font-semibold hover:underline">
              {t('Télécharge tes données ou supprime ton compte', 'Download your data or delete your account')}
            </Link>
          </p>
          <form action={deconnexion}>
            <button type="submit" className="hover:underline">{t('Me déconnecter', 'Log out')}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
