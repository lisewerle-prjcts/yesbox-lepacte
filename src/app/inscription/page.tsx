'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import InscriptionForm, { ConfirmationEmail } from '@/components/InscriptionForm'

export default function InscriptionPage() {
  const t = useT()
  const searchParams = useSearchParams()
  const codeParrainageInitial = searchParams.get('parrain')?.trim().toUpperCase() ?? ''
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  if (confirmationEmail) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Logo size="md" className="inline-block mb-6" />
          <div className="card">
            <ConfirmationEmail email={confirmationEmail} />
          </div>
          <p className="text-sm text-gray-500 mt-6">
            <Link href="/connexion" className="text-magenta font-semibold hover:underline">{t('Retour à la connexion', 'Back to login')}</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            <EditableText id="inscription.titre">Crée ton compte</EditableText>
          </h1>
          <p className="text-gray-500 mt-2">
            <EditableText id="inscription.souscritre">Et commence à construire votre pacte</EditableText>
          </p>
        </div>

        <div className="card">
          <InscriptionForm codeParrainageInitial={codeParrainageInitial} onNeedsConfirmation={setConfirmationEmail} />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <EditableText id="inscription.cgu.prefix">En créant un compte, tu acceptes nos</EditableText>{' '}
          <Link href="/mentions-legales" className="text-magenta hover:underline">
            <EditableText id="inscription.cgu.lien">conditions d&apos;utilisation</EditableText>
          </Link>.
        </p>
      </div>
    </div>
  )
}
