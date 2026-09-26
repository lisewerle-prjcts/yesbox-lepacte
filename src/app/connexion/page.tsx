'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import { connexion, renvoyerConfirmation, verifierCodeMfa, verifierCodeRecuperationMfa } from '@/app/actions/auth'
import { Eye, EyeOff } from 'lucide-react'

function SubmitButton({ label, pendingLabel }: { label: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? pendingLabel : label}
    </button>
  )
}

export default function ConnexionPage() {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [mfaResetNotice, setMfaResetNotice] = useState(false)
  const [callbackNotice, setCallbackNotice] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mfa_reset') === '1') setMfaResetNotice(true)
    if (params.get('mfa') === '1') setMfaRequired(true)
    if (params.get('error') === 'auth_callback_error') setCallbackNotice(true)
  }, [])

  async function handleAction(formData: FormData) {
    setError(null)
    setEmailNotConfirmed(null)
    setResendState('idle')
    const result = await connexion(formData)
    if (result?.error) {
      setError(result.error)
      if (result.emailNotConfirmed && result.email) setEmailNotConfirmed(result.email)
    } else if (result?.mfaRequired) {
      setMfaRequired(true)
    }
  }

  async function handleResend() {
    if (!emailNotConfirmed) return
    setResendState('sending')
    const result = await renvoyerConfirmation(emailNotConfirmed)
    if (result?.error) {
      setResendState('idle')
      setError(result.error)
    } else {
      setResendState('sent')
    }
  }

  async function handleMfaAction(formData: FormData) {
    setError(null)
    const code = (formData.get('code') as string) || ''
    const result = await verifierCodeMfa(code)
    if (result?.error) setError(result.error)
  }

  async function handleRecoveryAction(formData: FormData) {
    setError(null)
    const code = (formData.get('recovery_code') as string) || ''
    const result = await verifierCodeRecuperationMfa(code)
    if (result?.error) setError(result.error)
  }

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo size="md" className="inline-block mb-4" />
            <h1 className="font-fraunces text-2xl font-bold text-gray-900">{t('Vérification en deux étapes', 'Two-factor verification')}</h1>
            <p className="text-gray-500 mt-2">
              {useRecoveryCode ? t('Saisis un de tes codes de secours', 'Enter one of your backup codes') : t('Saisis le code à 6 chiffres de ton application d\'authentification', 'Enter the 6-digit code from your authenticator app')}
            </p>
          </div>
          <div className="card">
            {error && <Alert type="error" message={error} className="mb-5" />}
            {useRecoveryCode ? (
              <form action={handleRecoveryAction} className="space-y-5">
                <div>
                  <label htmlFor="recovery_code" className="label">{t('Code de secours', 'Backup code')}</label>
                  <input
                    id="recovery_code"
                    name="recovery_code"
                    type="text"
                    placeholder="XXXXX-XXXXX"
                    autoComplete="off"
                    required
                    className="input-field"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('Utiliser un code de secours désactive la 2FA sur ce compte. Tu pourras la réactiver une fois connecté·e.', 'Using a backup code disables 2FA on this account. You can turn it back on once signed in.')}</p>
                </div>
                <SubmitButton label={t('Vérifier', 'Verify')} pendingLabel={t('Vérification...', 'Verifying...')} />
              </form>
            ) : (
              <form action={handleMfaAction} className="space-y-5">
                <div>
                  <label htmlFor="code" className="label">{t('Code', 'Code')}</label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    autoComplete="one-time-code"
                    required
                    className="input-field"
                  />
                </div>
                <SubmitButton label={t('Vérifier', 'Verify')} pendingLabel={t('Vérification...', 'Verifying...')} />
              </form>
            )}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setUseRecoveryCode(v => !v); setError(null) }}
                className="text-sm text-gray-400 hover:text-magenta"
              >
                {useRecoveryCode ? t('Utiliser mon application d\'authentification', 'Use my authenticator app') : t('J\'ai perdu mon accès — utiliser un code de secours', "I've lost access — use a backup code")}
              </button>
            </div>
          </div>
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
            <EditableText id="connexion.titre">Content·e de te revoir !</EditableText>
          </h1>
          <p className="text-gray-500 mt-2">
            <EditableText id="connexion.souscritre">Connecte-toi à ton espace couple</EditableText>
          </p>
        </div>

        <div className="card">
          {callbackNotice && <Alert type="info" message={t("Si tu viens de cliquer sur le lien de confirmation, ton adresse est bien confirmée : il ne te reste plus qu'à te connecter.", "If you just clicked the confirmation link, your email address is confirmed: all you need to do now is sign in.")} className="mb-5" />}
          {mfaResetNotice && <Alert type="info" message={t("Ta double authentification a été désactivée avec un code de secours. Reconnecte-toi, puis réactive-la depuis l'onglet Sécurité.", 'Your two-factor authentication was turned off using a backup code. Sign back in, then re-enable it from the Security tab.')} className="mb-5" />}
          {error && (
            <div className="mb-5 space-y-2">
              <Alert type="error" message={error} />
              {emailNotConfirmed && (
                resendState === 'sent' ? (
                  <Alert type="success" message={t('Email de confirmation renvoyé ! Vérifie ta boîte mail (et tes spams).', 'Confirmation email resent! Check your inbox (and your spam folder).')} />
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending'}
                    className="text-sm text-magenta font-semibold hover:underline disabled:opacity-50"
                  >
                    {resendState === 'sending' ? t('Envoi...', 'Sending...') : t("Renvoyer l'email de confirmation", 'Resend confirmation email')}
                  </button>
                )
              )}
            </div>
          )}

          <form action={handleAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">
                <EditableText id="connexion.field.email">Email</EditableText>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder={t('marie@exemple.fr', 'alex@example.com')}
                autoComplete="email"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                <EditableText id="connexion.field.password">Mot de passe</EditableText>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('Ton mot de passe', 'Your password')}
                  autoComplete="current-password"
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

            <SubmitButton label={<EditableText id="connexion.submit">Se connecter</EditableText>} pendingLabel={t('Connexion...', 'Signing in...')} />
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              <EditableText id="connexion.pasdecompte">Pas encore de compte ?</EditableText>{' '}
              <Link href="/inscription" className="text-magenta font-semibold hover:underline">
                <EditableText id="connexion.sinscrire">S&apos;inscrire</EditableText>
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/mot-de-passe-oublie" className="text-gray-400 hover:text-magenta text-sm">
                <EditableText id="connexion.mdpoublie">Mot de passe oublié ?</EditableText>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
