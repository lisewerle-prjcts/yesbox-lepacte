'use client'

import { useState, useTransition } from 'react'
import { modifierReglages } from '@/app/actions/couple'
import { Check } from 'lucide-react'

interface Props {
  prenomInitial: string | null
  nomCoupleInitial: string
  dateAnniversaireInitial: string
  aCouple: boolean
  partnerName: string | null
}

export default function ReglagesForm({ prenomInitial, nomCoupleInitial, dateAnniversaireInitial, aCouple, partnerName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await modifierReglages(formData)
      if (res?.error) setError(res.error)
      else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <form action={onSubmit} className="card p-6 flex flex-col gap-5">
      <div>
        <label htmlFor="prenom" className="label">Ton prénom</label>
        <input id="prenom" name="prenom" type="text" defaultValue={prenomInitial ?? ''} className="input-field" required minLength={2} />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>C'est ce prénom qui nomme le module 1 ou 2 qui t'est consacré.</p>
      </div>

      {aCouple && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
          <div>
            <label htmlFor="nom_couple" className="label">Le nom de votre couple <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <input id="nom_couple" name="nom_couple" type="text" defaultValue={nomCoupleInitial} placeholder="Ex : Marie & Pierre" className="input-field" />
          </div>
          <div>
            <label htmlFor="date_anniversaire" className="label">Date d'anniversaire de relation <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <input id="date_anniversaire" name="date_anniversaire" type="date" defaultValue={dateAnniversaireInitial} className="input-field" />
          </div>
          {partnerName && (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Ton/ta partenaire : <strong>{partnerName}</strong> (modifiable uniquement depuis son propre espace)</p>
          )}
        </>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

      <button type="submit" disabled={isPending} className="btn-brand flex items-center justify-center gap-2">
        {saved ? <><Check className="w-4 h-4" />Enregistré</> : isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
