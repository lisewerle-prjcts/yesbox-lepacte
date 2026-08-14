'use client'

import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
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
            <EditableText id="mdpoublie.titre">Mot de passe oublié</EditableText>
          </h1>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="font-fraunces text-xl font-bold mb-2"><EditableText id="mdpoublie.envoye.titre">Email envoyé !</EditableText></h2>
              <p className="text-gray-500 text-sm mb-6">
                <EditableText id="mdpoublie.envoye.texte" multiline>Vérifie ta boîte mail pour réinitialiser ton mot de passe.</EditableText>
              </p>
              <Link href="/connexion" className="btn-primary">
                <EditableText id="mdpoublie.retour">Retour à la connexion</EditableText>
              </Link>
            </div>
          ) : (
            <>
              {error && <Alert type="error" message={error} className="mb-5" />}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label"><EditableText id="mdpoublie.field.email">Email</EditableText></label>
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
                  {loading ? 'Envoi...' : <EditableText id="mdpoublie.submit">Envoyer le lien</EditableText>}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/connexion" className="text-sm text-gray-400 hover:text-magenta">
                  ← <EditableText id="mdpoublie.retourlien">Retour à la connexion</EditableText>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
