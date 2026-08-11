'use client'

import { useState, useTransition } from 'react'
import YesBoxLogo from '@/components/YesBoxLogo'
import IntroTexte from '@/components/IntroTexte'
import { marquerIntroVue } from '@/app/actions/profile'
import { ArrowRight, ArrowLeft } from 'lucide-react'

export default function BienvenueClient({ prenomInitial }: { prenomInitial: string | null }) {
  const [step, setStep] = useState<'intro' | 'prenom'>('intro')
  const [prenom, setPrenom] = useState(prenomInitial ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function valider() {
    if (prenom.trim().length < 2) {
      setError('Ton prénom doit contenir au moins 2 caractères.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await marquerIntroVue(prenom)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #FAF6F0)' }} className="flex items-center justify-center px-4 py-12">
      <div className="card p-8 sm:p-10 fade" style={{ maxWidth: 640 }}>
        <div className="flex justify-center mb-8">
          <YesBoxLogo size="md" />
        </div>

        {step === 'intro' ? (
          <>
            <IntroTexte />

            <button type="button" onClick={() => setStep('prenom')} className="btn-brand lg w-full flex items-center justify-center gap-2 mt-9">
              J'ai compris, on commence <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-2">
              <p className="eyebrow justify-center mb-3">Avant de commencer</p>
              <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                Quel est ton prénom ?
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
                Il servira à nommer le module qui te sera consacré, et à te présenter à ton/ta partenaire.
              </p>
            </div>

            <input
              type="text"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              placeholder="Ton prénom"
              className="field"
              style={{ fontSize: 16, textAlign: 'center', marginBottom: 8 }}
              autoFocus
            />
            {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</p>}

            <button type="button" onClick={valider} disabled={isPending}
              className="btn-brand lg w-full flex items-center justify-center gap-2 mt-6">
              {isPending ? 'Enregistrement…' : "C'est parti"} <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setStep('intro')}
              className="flex items-center justify-center gap-1.5 text-sm font-medium mx-auto mt-4"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
              <ArrowLeft className="w-3.5 h-3.5" />Revoir l'introduction
            </button>
          </>
        )}
      </div>
    </div>
  )
}
