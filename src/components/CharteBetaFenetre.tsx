'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import YesBoxLogo from '@/components/YesBoxLogo'
import CharteBeta, { CASE_CHARTE_BETA } from '@/components/CharteBeta'

// Page plein écran ouverte par le formulaire d'inscription quand le code
// BETANLR26 est saisi. Rendue dans <body> pour couvrir aussi la fenêtre
// d'inscription de la page d'accueil (InscriptionModal).
export default function CharteBetaFenetre({ onAccepter, onFermer }: { onAccepter: () => void; onFermer: () => void }) {
  const [coche, setCoche] = useState(false)
  const [monte, setMonte] = useState(false)

  useEffect(() => {
    setMonte(true)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  if (!monte) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Charte de participation à la bêta"
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 200, background: 'var(--paper)' }}
    >
      <header className="sticky top-0 z-10 border-b" style={{ background: 'rgba(251,248,243,0.95)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" href="" />
          <button type="button" onClick={onFermer} className="btn-ghost text-sm py-2 px-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <CharteBeta />

        <div className="card mt-10">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>À cocher pour finaliser ton inscription :</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={coche} onChange={e => setCoche(e.target.checked)} className="mt-1 flex-shrink-0" />
            <span className="text-sm text-gray-600">{CASE_CHARTE_BETA}</span>
          </label>
          <button type="button" disabled={!coche} onClick={onAccepter} className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed">
            J&apos;accepte la charte
          </button>
          <p className="text-center text-sm mt-4" style={{ color: 'var(--muted)' }}>
            Merci de votre confiance, et belle découverte à vous deux !
          </p>
        </div>
      </main>
    </div>,
    document.body,
  )
}
