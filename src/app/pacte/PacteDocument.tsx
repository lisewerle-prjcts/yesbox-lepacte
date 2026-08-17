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
    <div className="card mb-8">
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="w-5 h-5 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">Complétez votre pacte</h2>
      </div>
      <p className="text-gray-500 text-sm mb-4">
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
        <p className="text-xs text-gray-400">
          {modifiePar && modifieLe
            ? `Dernière modification par ${modifiePar} le ${new Date(modifieLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Pas encore modifié'}
        </p>
        <button onClick={save} disabled={status === 'saving'} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          {status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? <><Check className="w-4 h-4" /> Sauvegardé</> : status === 'error' ? 'Erreur — réessaie' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
