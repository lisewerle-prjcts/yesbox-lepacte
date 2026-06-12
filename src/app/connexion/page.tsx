'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { connexion } from '@/app/actions/auth'
import { Eye, EyeOff } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? 'Connexion...' : 'Se connecter'}
    </button>
  )
}

export default function ConnexionPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await connexion(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            Content·e de te revoir !
          </h1>
          <p className="text-gray-500 mt-2">
            Connecte-toi à ton espace couple
          </p>
        </div>

        <div className="card">
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleAction} className="space-y-5">
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

            <SubmitButton />
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link href="/inscription" className="text-magenta font-semibold hover:underline">
                S'inscrire
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/mot-de-passe-oublie" className="text-gray-400 hover:text-magenta text-sm">
                Mot de passe oublié ?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
