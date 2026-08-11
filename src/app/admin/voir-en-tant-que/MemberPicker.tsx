'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'

interface Member { id: string; prenom: string | null; email: string }

export default function MemberPicker({
  profiles,
  defaultUserId,
}: {
  profiles: Member[]
  defaultUserId?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(defaultUserId || '')

  function go() {
    if (!selected) return
    router.push(`/admin/voir-en-tant-que?userId=${selected}`)
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <select
        className="field"
        style={{ minWidth: 260 }}
        value={selected}
        onChange={e => setSelected(e.target.value)}
      >
        <option value="">Choisir le nom du membre…</option>
        {profiles.map(p => (
          <option key={p.id} value={p.id}>{p.prenom || '—'} — {p.email}</option>
        ))}
      </select>
      <button
        onClick={go}
        disabled={!selected}
        className="btn-brand text-sm py-2 px-4 flex items-center gap-2"
        style={{ opacity: selected ? 1 : 0.5 }}
      >
        <Eye className="w-4 h-4" /> Voir en tant que
      </button>
    </div>
  )
}
