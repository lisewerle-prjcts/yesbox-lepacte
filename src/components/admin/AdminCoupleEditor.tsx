'use client'

import { useState, useTransition } from 'react'
import { adminUpdateCoupleInfo } from '@/app/actions/admin'
import { Check, Pencil } from 'lucide-react'

interface Member { id: string; prenom: string | null; email: string }

export default function AdminCoupleEditor({ coupleId, nomCoupleInitial, members }: { coupleId: string; nomCoupleInitial: string | null; members: Member[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      await adminUpdateCoupleInfo(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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
        <input type="text" name="nom_couple" defaultValue={nomCoupleInitial ?? ''} className="field" placeholder="Ex : Marie & Pierre" />
      </div>
      {members.map(m => (
        <div key={m.id}>
          <label className="flabel">Prénom de {m.email}</label>
          <input type="text" name={`prenom_${m.id}`} defaultValue={m.prenom ?? ''} className="field" minLength={2} />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-brand text-sm py-2 flex items-center gap-2">
          {saved ? <><Check className="w-3.5 h-3.5" />Enregistré</> : isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm py-2">Fermer</button>
      </div>
    </form>
  )
}
