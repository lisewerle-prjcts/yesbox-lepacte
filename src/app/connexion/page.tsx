'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
import { connexion, verifierCodeMfa, verifierCodeRecuperationMfa } from '@/app/actions/auth'
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
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [mfaResetNotice, setMfaResetNotice] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mfa_reset') === '1') setMfaResetNotice(true)
  }, [])

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await connexion(formData)
    if (result?.error) setError(result.error)
    else if (result?.mfaRequired) setMfaRequired(true)
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
            <h1 className="font-fraunces text-2xl font-bold text-gray-900">Vérification en deux étapes</h1>
            <p className="text-gray-500 mt-2">
              {useRecoveryCode ? 'Saisis un de tes codes de secours' : 'Saisis le code à 6 chiffres de ton application d\'authentification'}
            </p>
          </div>
          <div className="card">
            {error && <Alert type="error" message={error} className="mb-5" />}
            {useRecoveryCode ? (
              <form action={handleRecoveryAction} className="space-y-5">
                <div>
                  <label htmlFor="recovery_code" className="label">Code de secours</label>
                  <input
                    id="recovery_code"
                    name="recovery_code"
                    type="text"
                    placeholder="XXXXX-XXXXX"
                    autoComplete="off"
                    required
                    className="input-field"
                  />
                  <p className="text-xs text-gray-400 mt-1">Utiliser un code de secours désactive la 2FA sur ce compte. Tu pourras la réactiver une fois connecté·e.</p>
                </div>
                <SubmitButton label="Vérifier" pendingLabel="Vérification..." />
              </form>
            ) : (
              <form action={handleMfaAction} className="space-y-5">
                <div>
                  <label htmlFor="code" className="label">Code</label>
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
                <SubmitButton label="Vérifier" pendingLabel="Vérification..." />
              </form>
            )}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setUseRecoveryCode(v => !v); setError(null) }}
                className="text-sm text-gray-400 hover:text-magenta"
              >
                {useRecoveryCode ? 'Utiliser mon application d\'authentification' : 'J\'ai perdu mon accès — utiliser un code de secours'}
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
          {mfaResetNotice && <Alert type="info" message="Ta double authentification a été désactivée avec un code de secours. Reconnecte-toi, puis réactive-la depuis l'onglet Sécurité." className="mb-5" />}
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">
                <EditableText id="connexion.field.email">Email</EditableText>
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
                <EditableText id="connexion.field.password">Mot de passe</EditableText>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ton mot de passe"
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

            <SubmitButton label={<EditableText id="connexion.submit">Se connecter</EditableText>} pendingLabel="Connexion..." />
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
