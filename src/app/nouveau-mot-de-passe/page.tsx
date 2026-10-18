'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { useT } from '@/components/i18n/LocaleContext'
import { definirNouveauMotDePasse } from '@/app/actions/mot-de-passe'

// Page ouverte depuis le lien « mot de passe oublié » (session ouverte par
// /auth/confirm) : le nouveau mot de passe est saisi deux fois.
export default function NouveauMotDePassePage() {
  const t = useT()
  const router = useRouter()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (motDePasse !== confirmation) {
      setError(t('Les deux mots de passe ne sont pas identiques', 'The two passwords do not match'))
      return
    }
    setLoading(true)
    try {
      const res = await definirNouveauMotDePasse(motDePasse, confirmation)
      if (res.error) setError(res.error)
      else {
        setFait(true)
        setTimeout(() => router.push('/tableau-de-bord'), 2000)
      }
    } catch {
      setError(t("Le changement n'a pas pu être enregistré. Réessaie.", 'The change could not be saved. Please try again.'))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">{t('Nouveau mot de passe', 'New password')}</h1>
        </div>

        <div className="card">
          {fait ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="font-fraunces text-xl font-bold mb-2">{t('Mot de passe modifié !', 'Password changed!')}</h2>
              <p className="text-gray-500 text-sm">{t('Redirection vers ton espace…', 'Taking you to your space…')}</p>
            </div>
          ) : (
            <>
              {error && <Alert type="error" message={error} className="mb-5" />}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="mot-de-passe" className="label">{t('Nouveau mot de passe', 'New password')}</label>
                  <div className="relative">
                    <input
                      id="mot-de-passe"
                      type={visible ? 'text' : 'password'}
                      value={motDePasse}
                      onChange={e => setMotDePasse(e.target.value)}
                      placeholder={t('Au moins 8 caractères', 'At least 8 characters')}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      aria-label={visible ? t('Masquer le mot de passe', 'Hide password') : t('Afficher le mot de passe', 'Show password')}
                    >
                      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmation" className="label">{t('Confirme le mot de passe', 'Confirm the password')}</label>
                  <input
                    id="confirmation"
                    type={visible ? 'text' : 'password'}
                    value={confirmation}
                    onChange={e => setConfirmation(e.target.value)}
                    placeholder={t('Retape le même mot de passe', 'Type the same password again')}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="input-field"
                  />
                  {confirmation && confirmation !== motDePasse && (
                    <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{t('Les deux mots de passe ne sont pas identiques', 'The two passwords do not match')}</p>
                  )}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading && <Spinner size="sm" />}
                  {loading ? t('Enregistrement…', 'Saving…') : t('Enregistrer le nouveau mot de passe', 'Save the new password')}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/mot-de-passe-oublie" className="text-sm text-gray-400 hover:text-magenta">
                  {t('Lien expiré ? Refaire une demande', 'Link expired? Request a new one')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
