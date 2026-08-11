'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { definirNouveauMotDePasse } from '@/app/actions/auth'
import { Eye, EyeOff } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? 'Mise à jour...' : 'Choisir ce mot de passe'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await definirNouveauMotDePasse(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block mb-4" />
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            Choisis un nouveau mot de passe
          </h1>
        </div>

        <div className="card">
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleAction} className="space-y-5">
            <div>
              <label htmlFor="password" className="label">Nouveau mot de passe</label>
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
              <label htmlFor="passwordConfirmation" className="label">Confirme le mot de passe</label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type={showPassword ? 'text' : 'password'}
                placeholder="Retape le même mot de passe"
                autoComplete="new-password"
                required
                className="input-field"
              />
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  )
}
