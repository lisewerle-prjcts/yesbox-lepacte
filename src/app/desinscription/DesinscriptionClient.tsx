'use client'

import { useState } from 'react'
import Link from 'next/link'
import { seDesinscrireDesRappels } from '@/app/actions/rappels'

export default function DesinscriptionClient({ userId, signature }: { userId: string; signature: string }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'fait' | 'erreur'>('idle')
  const [erreur, setErreur] = useState('')

  async function confirmer() {
    setStatus('saving')
    const res = await seDesinscrireDesRappels(userId, signature)
    if (res.error) { setErreur(res.error); setStatus('erreur'); return }
    setStatus('fait')
  }

  return (
    <div className="card p-6 text-center">
      <h1 className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 12 }}>
        {status === 'fait' ? 'C’est noté' : 'Ne plus recevoir les rappels'}
      </h1>
      {status === 'fait' ? (
        <p style={{ color: 'var(--muted)' }}>
          Tu ne recevras plus les e-mails de rappel YES BOX. Les e-mails liés à ton compte (étapes de votre parcours, mot de passe…) continuent d’arriver. Tu peux réactiver les rappels à tout moment depuis <Link href="/mon-compte" style={{ color: 'var(--brand)' }}>Mon compte</Link>.
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            Tu ne recevras plus les rappels quand votre parcours est en pause, ni les e-mails mensuels autour de votre pacte.
          </p>
          {status === 'erreur' && <p role="alert" style={{ color: 'var(--brand-deep)', marginBottom: 16 }}>{erreur}</p>}
          <button onClick={confirmer} disabled={status === 'saving' || !userId || !signature} className="btn-brand">
            {status === 'saving' ? 'Un instant…' : 'Confirmer'}
          </button>
        </>
      )}
    </div>
  )
}
