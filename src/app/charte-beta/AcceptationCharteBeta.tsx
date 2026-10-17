'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { CASE_CHARTE_BETA } from '@/components/CharteBeta'
import { accepterCharteBeta } from '@/app/actions/compte'
import { deconnexion } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
      {pending ? <Spinner size="sm" /> : null}
      {pending ? 'Enregistrement…' : 'J’accepte la charte'}
    </button>
  )
}

export default function AcceptationCharteBeta() {
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await accepterCharteBeta(formData)
    if (result?.error) {
      setError(result.error)
      return
    }
    window.location.href = '/tableau-de-bord'
  }

  return (
    <div className="card mt-10">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
        Votre couple participe à la bêta. Pour accéder à votre espace, merci de cocher :
      </p>
      {error && <Alert type="error" message={error} className="mb-4" />}
      <form action={handleAction}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="charte_beta" required className="mt-1 flex-shrink-0" />
          <span className="text-sm text-gray-600">{CASE_CHARTE_BETA}</span>
        </label>
        <SubmitButton />
      </form>
      <p className="text-center text-sm mt-4" style={{ color: 'var(--muted)' }}>
        Merci de votre confiance, et belle découverte à vous deux !
      </p>
      <form action={deconnexion} className="text-center mt-2">
        <button type="submit" className="text-sm text-gray-500 hover:underline">Me déconnecter</button>
      </form>
    </div>
  )
}
