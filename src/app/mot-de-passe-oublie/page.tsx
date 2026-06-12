'use client'

import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
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
                Vérifie ta boîte mail pour réinitialiser ton mot de passe.
              </p>
              <Link href="/connexion" className="btn-primary">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {error && <Alert type="error" message={error} className="mb-5" />}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.fr"
                    required
                    className="input-field"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading && <Spinner size="sm" />}
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
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
