'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
import { inscription, renvoyerConfirmation } from '@/app/actions/auth'
import { Eye, EyeOff, MailCheck } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? 'Création en cours...' : <EditableText id="inscription.submit">Créer mon compte</EditableText>}
    </button>
  )
}

export default function InscriptionPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await inscription(formData)
    if (result?.error) setError(result.error)
    else if (result?.needsConfirmation) setConfirmationEmail(result.email)
  }

  async function handleResend() {
    if (!confirmationEmail) return
    setResendState('sending')
    const result = await renvoyerConfirmation(confirmationEmail)
    setResendState(result?.error ? 'idle' : 'sent')
  }

  if (confirmationEmail) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Logo size="md" className="inline-block mb-6" />
          <div className="card">
            <MailCheck className="w-10 h-10 text-magenta mx-auto mb-3" />
            <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">Vérifie ta boîte mail</h1>
            <p className="text-gray-500 mb-1">
              On a envoyé un lien de confirmation à <span className="font-semibold text-gray-700">{confirmationEmail}</span>.
            </p>
            <p className="text-gray-500 mb-6">
              Clique sur ce lien pour activer ton compte et accéder à ton espace couple. Pense à vérifier tes spams.
            </p>
            {resendState === 'sent' ? (
              <Alert type="success" message="Email renvoyé ! Vérifie ta boîte mail (et tes spams)." />
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === 'sending'}
                className="text-sm text-magenta font-semibold hover:underline disabled:opacity-50"
              >
                {resendState === 'sending' ? 'Envoi...' : "Je n'ai rien reçu, renvoyer l'email"}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-6">
            <Link href="/connexion" className="text-magenta font-semibold hover:underline">Retour à la connexion</Link>
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
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleAction} className="space-y-5">
            <div>
              <label htmlFor="prenom" className="label">
                <EditableText id="inscription.field.prenom">Ton prénom</EditableText>
              </label>
              <input
                id="prenom"
                name="prenom"
                type="text"
                placeholder="Marie"
                autoComplete="given-name"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                <EditableText id="inscription.field.email">Email</EditableText>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="marie@exemple.fr"
                autoComplete="email"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                <EditableText id="inscription.field.password">Mot de passe</EditableText>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  required
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="partner_code" className="label">
                <EditableText id="inscription.field.code">Code de ton/ta partenaire</EditableText> <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                id="partner_code"
                name="partner_code"
                type="text"
                placeholder="Ex : A3F9K2"
                maxLength={6}
                autoCapitalize="characters"
                className="input-field uppercase"
              />
              <p className="text-xs text-gray-400 mt-1">
                <EditableText id="inscription.field.code.aide" multiline>Ton/ta partenaire a déjà créé son profil ? Renseigne son code à 6 caractères pour être pairé·e directement. Sinon, tu pourras l&apos;ajouter plus tard.</EditableText>
              </p>
            </div>

            <SubmitButton />
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              <EditableText id="inscription.dejacompte">Tu as déjà un compte ?</EditableText>{' '}
              <Link href="/connexion" className="text-magenta font-semibold hover:underline">
                <EditableText id="inscription.seconnecter">Se connecter</EditableText>
              </Link>
            </p>
          </div>
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
