'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { rejoindreCouple } from '@/app/actions/couple'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'

function RejoindreContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ email: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email! })
    })
  }, [])

  async function handleRejoindre() {
    if (!token) {
      setError('Lien d\'invitation invalide')
      setStatus('error')
      return
    }

    setStatus('loading')

    if (!user) {
      router.push(`/inscription?redirect=/rejoindre?token=${token}`)
      return
    }

    const result = await rejoindreCouple(token)
    if (result.error) {
      setError(result.error)
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => router.push('/tableau-de-bord'), 2000)
    }
  }

  if (!token) {
    return (
      <Alert type="error" message="Lien d'invitation invalide ou manquant." />
    )
  }

  return (
    <div className="card text-center animate-slide-up">
      {status === 'success' ? (
        <>
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">
            Vous êtes maintenant connectés !
          </h1>
          <p className="text-gray-500 mb-4">
            Redirection vers votre tableau de bord...
          </p>
          <Spinner className="mx-auto" />
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-magenta-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-magenta" />
          </div>
          <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">
            Tu es invité·e à rejoindre un pacte !
          </h1>
          <p className="text-gray-500 mb-6">
            {user
              ? `Tu rejoindras le pacte avec le compte ${user.email}`
              : 'Connecte-toi ou crée un compte pour rejoindre ce pacte.'}
          </p>

          {error && <Alert type="error" message={error} className="mb-5" />}

          {user ? (
            <button
              onClick={handleRejoindre}
              disabled={status === 'loading'}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {status === 'loading' ? <Spinner size="sm" /> : <Heart className="w-4 h-4" />}
              {status === 'loading' ? 'Connexion...' : 'Rejoindre le pacte'}
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/connexion?redirect=/rejoindre?token=${token}`)}
                className="btn-primary w-full"
              >
                Se connecter pour rejoindre
              </button>
              <button
                onClick={() => router.push(`/inscription?redirect=/rejoindre?token=${token}`)}
                className="btn-secondary w-full"
              >
                Créer un compte
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RejoindreCouplePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="inline-block" />
        </div>
        <Suspense fallback={<Spinner className="mx-auto" />}>
          <RejoindreContent />
        </Suspense>
      </div>
    </div>
  )
}
