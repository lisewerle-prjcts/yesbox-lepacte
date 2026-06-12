'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { inscription } from '@/app/actions/auth'
import { Eye, EyeOff } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? 'Création en cours...' : 'Créer mon compte'}
    </button>
  )
}

export default function InscriptionPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await inscription(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            Crée ton compte
          </h1>
          <p className="text-gray-500 mt-2">
            Et commence à construire votre pacte
          </p>
        </div>

        <div className="card">
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleAction} className="space-y-5">
            <div>
              <label htmlFor="prenom" className="label">
                Ton prénom
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
                Email
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
                Mot de passe
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

            <SubmitButton />
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Tu as déjà un compte ?{' '}
              <Link href="/connexion" className="text-magenta font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          En créant un compte, tu acceptes nos conditions d'utilisation.
        </p>
      </div>
    </div>
  )
}
