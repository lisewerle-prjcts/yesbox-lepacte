'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { demanderResetMotDePasse } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? 'Envoi...' : 'Envoyer le lien'}
    </button>
  )
}

export default function MotDePasseOubliePage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await demanderResetMotDePasse(formData)
    if (result?.error) setError(result.error)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            Mot de passe oublié
          </h1>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="font-fraunces text-xl font-bold mb-2">Email envoyé !</h2>
              <p className="text-gray-500 text-sm mb-6">
                Si un compte existe avec cette adresse, tu vas recevoir un lien pour réinitialiser ton mot de passe.
              </p>
              <Link href="/connexion" className="btn-primary">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {error && <Alert type="error" message={error} className="mb-5" />}
              <form action={handleAction} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="ton@email.fr"
                    autoComplete="email"
                    required
                    className="input-field"
                  />
                </div>
                <SubmitButton />
              </form>
              <div className="mt-4 text-center">
                <Link href="/connexion" className="text-sm text-gray-400 hover:text-magenta">
                  ← Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
