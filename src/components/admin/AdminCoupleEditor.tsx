'use client'

import { useState, useTransition } from 'react'
import { adminUpdateCoupleInfo, adminDeleteCouple } from '@/app/actions/admin'
import { Check, Pencil, Trash2 } from 'lucide-react'

interface Props {
  coupleId: string
  nomCoupleInitial: string | null
  prenom1Initial: string | null
  prenom2Initial: string | null
  peutSupprimer: boolean
}

export default function AdminCoupleEditor({ coupleId, nomCoupleInitial, prenom1Initial, prenom2Initial, peutSupprimer }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await adminUpdateCoupleInfo(formData)
      if (res?.error) setError(res.error)
      else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function onDelete() {
    if (!confirm('Supprimer définitivement ce couple (sans membre inscrit) ?')) return
    startTransition(async () => {
      const res = await adminDeleteCouple(coupleId)
      if (res?.error) setError(res.error)
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium"
        style={{ background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
        <Pencil className="w-3 h-3" />Configurer
      </button>
    )
  }

  return (
    <form action={onSubmit} className="mt-3 p-4 flex flex-col gap-3 w-full" style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
      <input type="hidden" name="couple_id" value={coupleId} />
      <div>
        <label className="flabel">Nom du couple</label>
        <input type="text" name="nom_couple" defaultValue={nomCoupleInitial ?? ''} className="field" placeholder="Ex : Lise & Jé" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="flabel">Prénom · partenaire 1 (module 1)</label>
          <input type="text" name="prenom_partenaire1" defaultValue={prenom1Initial ?? ''} className="field" minLength={2} />
        </div>
        <div>
          <label className="flabel">Prénom · partenaire 2 (module 2)</label>
          <input type="text" name="prenom_partenaire2" defaultValue={prenom2Initial ?? ''} className="field" minLength={2} />
        </div>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 12 }}>{error}</p>}
      <div className="flex gap-2 items-center flex-wrap">
        <button type="submit" disabled={isPending} className="btn-brand text-sm py-2 flex items-center gap-2">
          {saved ? <><Check className="w-3.5 h-3.5" />Enregistré</> : isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm py-2">Fermer</button>
        {peutSupprimer && (
          <button type="button" onClick={onDelete} disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium ml-auto"
            style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626' }}>
            <Trash2 className="w-3.5 h-3.5" />Supprimer ce couple vide
          </button>
        )}
      </div>
    </form>
  )
}
