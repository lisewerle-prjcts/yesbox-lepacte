'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import { inscription, renvoyerConfirmation } from '@/app/actions/auth'
import { Eye, EyeOff, MailCheck } from 'lucide-react'

// Formulaire d'inscription partagé entre la page /inscription et la fenêtre
// d'inscription de la page d'accueil et des tarifs (InscriptionModal).

function SubmitButton({ submitId, submitLabel }: { submitId: string; submitLabel: string }) {
  const { pending } = useFormStatus()
  const t = useT()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? t('Création en cours...', 'Creating account...') : <EditableText id={submitId}>{submitLabel}</EditableText>}
    </button>
  )
}

export function ConfirmationEmail({ email }: { email: string }) {
  const t = useT()
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleResend() {
    setResendState('sending')
    const result = await renvoyerConfirmation(email)
    setResendState(result?.error ? 'idle' : 'sent')
  }

  return (
    <div className="text-center">
      <MailCheck className="w-10 h-10 text-magenta mx-auto mb-3" />
      <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">{t('Vérifie ta boîte mail', 'Check your inbox')}</h1>
      <p className="text-gray-500 mb-1">
        {t('On a envoyé un lien de confirmation à', 'We sent a confirmation link to')} <span className="font-semibold text-gray-700">{email}</span>.
      </p>
      <p className="text-gray-500 mb-6">
        {t('Clique sur ce lien pour activer ton compte et accéder à ton espace couple. Pense à vérifier tes spams.', 'Click the link to activate your account and access your couple space. Be sure to check your spam folder.')}
      </p>
      {resendState === 'sent' ? (
        <Alert type="success" message={t('Email renvoyé ! Vérifie ta boîte mail (et tes spams).', 'Email resent! Check your inbox (and your spam folder).')} />
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resendState === 'sending'}
          className="text-sm text-magenta font-semibold hover:underline disabled:opacity-50"
        >
          {resendState === 'sending' ? t('Envoi...', 'Sending...') : t("Je n'ai rien reçu, renvoyer l'email", "I didn't receive anything, resend the email")}
        </button>
      )}
    </div>
  )
}

export default function InscriptionForm({
  codeParrainageInitial = '',
  submitId = 'inscription.submit',
  submitLabel = 'Créer mon compte',
  onNeedsConfirmation,
}: {
  codeParrainageInitial?: string
  submitId?: string
  submitLabel?: string
  onNeedsConfirmation: (email: string) => void
}) {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleAction(formData: FormData) {
    setError(null)
    const password = formData.get('password') as string
    const passwordConfirm = formData.get('password_confirm') as string
    if (password !== passwordConfirm) {
      setError(t('Les deux mots de passe ne correspondent pas', 'The two passwords do not match'))
      return
    }
    const result = await inscription(formData)
    if (result?.error) setError(result.error)
    else if (result?.needsConfirmation) onNeedsConfirmation(result.email)
  }

  return (
    <>
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
            placeholder={t('Marie', 'Mary')}
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
            placeholder={t('marie@exemple.fr', 'mary@example.com')}
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
              placeholder={t('8 caractères minimum', '8 characters minimum')}
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
          <label htmlFor="password_confirm" className="label">
            <EditableText id="inscription.field.passwordconfirm">Confirme ton mot de passe</EditableText>
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('Retape ton mot de passe', 'Retype your password')}
            autoComplete="new-password"
            required
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="partner_code" className="label">
            <EditableText id="inscription.field.code">Code de ton/ta partenaire</EditableText> <span className="text-gray-400 font-normal">{t('(optionnel)', '(optional)')}</span>
          </label>
          <input
            id="partner_code"
            name="partner_code"
            type="text"
            placeholder={t('Ex : A3F9K', 'e.g. A3F9K')}
            maxLength={5}
            autoCapitalize="characters"
            className="input-field uppercase"
          />
          <p className="text-xs text-gray-400 mt-1">
            <EditableText id="inscription.field.code.aide" multiline>Ton/ta partenaire a déjà créé son profil ? Renseigne son code à 5 caractères pour être pairé·e directement. Sinon, tu pourras l&apos;ajouter plus tard.</EditableText>
          </p>
        </div>

        <div>
          <label htmlFor="code_parrainage" className="label">
            <EditableText id="inscription.field.parrainage">Code de parrainage</EditableText> <span className="text-gray-400 font-normal">{t('(optionnel)', '(optional)')}</span>
          </label>
          <input
            id="code_parrainage"
            name="code_parrainage"
            type="text"
            placeholder={t('Ex : B7K2Q9', 'e.g. B7K2Q9')}
            defaultValue={codeParrainageInitial}
            maxLength={6}
            autoCapitalize="characters"
            className="input-field uppercase"
          />
        </div>

        <div className="space-y-3">
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
        </div>

        <SubmitButton submitId={submitId} submitLabel={submitLabel} />
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          <EditableText id="inscription.dejacompte">Tu as déjà un compte ?</EditableText>{' '}
          <Link href="/connexion" className="text-magenta font-semibold hover:underline">
            <EditableText id="inscription.seconnecter">Se connecter</EditableText>
          </Link>
        </p>
      </div>
    </>
  )
}
