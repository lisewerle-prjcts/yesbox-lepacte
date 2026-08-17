'use client'

import { useState } from 'react'
import { PenLine, Check } from 'lucide-react'
import { enregistrerPacteTexte } from '@/app/actions/couple'

export default function PacteDocument({
  initialTexte,
  modifiePar,
  modifieLe,
}: {
  initialTexte: string
  modifiePar: string | null
  modifieLe: string | null
}) {
  const [texte, setTexte] = useState(initialTexte)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    const res = await enregistrerPacteTexte(texte)
    setStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Complétez votre pacte</h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Un espace libre pour écrire ensemble vos engagements, vos règles de couple, ou tout ce que vous voulez vous promettre. Vous pouvez tous les deux le modifier.
      </p>
      <textarea
        className="field"
        rows={8}
        placeholder="Ex : Nous nous engageons à...&#10;Nos règles à nous...&#10;Ce qu'on se promet l'un à l'autre..."
        value={texte}
        onChange={e => setTexte(e.target.value)}
      />
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <p style={{ fontSize: 12, color: 'var(--muted-2)' }}>
          {modifiePar && modifieLe
            ? `Dernière modification par ${modifiePar} le ${new Date(modifieLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Pas encore modifié'}
        </p>
        <button onClick={save} disabled={status === 'saving'} className="btn-brand text-sm py-2 px-4 flex items-center gap-2">
          {status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? <><Check className="w-4 h-4" /> Sauvegardé</> : status === 'error' ? 'Erreur — réessaie' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
