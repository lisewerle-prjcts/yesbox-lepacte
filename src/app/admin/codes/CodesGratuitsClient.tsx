'use client'

import { useState } from 'react'
import { adminCreerCodeGratuit, adminBasculerCodeGratuit } from '@/app/actions/admin'

interface CodeGratuit {
  id: string
  code: string
  duree_mois: number | null
  usages_max: number
  usages: number
  actif: boolean
  note: string | null
  created_at: string
}

export default function CodesGratuitsClient({ codes: initialCodes }: { codes: CodeGratuit[] }) {
  const [codes, setCodes] = useState(initialCodes)
  const [codeInput, setCodeInput] = useState('')
  const [dureeMois, setDureeMois] = useState('')
  const [usagesMax, setUsagesMax] = useState('1')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function creer() {
    setError('')
    setCreating(true)
    const res = await adminCreerCodeGratuit({
      code: codeInput || undefined,
      dureeMois: dureeMois ? Number(dureeMois) : null,
      usagesMax: Number(usagesMax) || 1,
      note,
    })
    setCreating(false)
    if (res.error) { setError(res.error); return }
    setCodes(cs => [{
      id: crypto.randomUUID(), code: res.code!, duree_mois: dureeMois ? Number(dureeMois) : null,
      usages_max: Number(usagesMax) || 1, usages: 0, actif: true, note: note || null, created_at: new Date().toISOString(),
    }, ...cs])
    setCodeInput(''); setDureeMois(''); setUsagesMax('1'); setNote('')
  }

  async function basculer(id: string, actif: boolean) {
    setCodes(cs => cs.map(c => c.id === id ? { ...c, actif } : c))
    await adminBasculerCodeGratuit(id, actif)
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ fontSize: 15 }}>Créer un code</h2>
        <div className="grid sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Code (vide = généré)</label>
            <input className="field uppercase" placeholder="BETA2026" value={codeInput} onChange={e => setCodeInput(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Durée (mois, vide = illimité)</label>
            <input type="number" min={1} className="field" placeholder="12" value={dureeMois} onChange={e => setDureeMois(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre max d&apos;utilisations</label>
            <input type="number" min={1} className="field" value={usagesMax} onChange={e => setUsagesMax(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Note (interne)</label>
            <input className="field" placeholder="Ex : testeurs beta" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button onClick={creer} disabled={creating} className="btn-primary text-sm py-2 px-4">
          {creating ? 'Création…' : 'Créer le code'}
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ fontSize: 15 }}>Codes existants</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun code créé pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="py-2">Code</th>
                <th className="py-2">Durée</th>
                <th className="py-2">Usages</th>
                <th className="py-2">Note</th>
                <th className="py-2">Statut</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 font-mono font-semibold">{c.code}</td>
                  <td className="py-2">{c.duree_mois ? `${c.duree_mois} mois` : 'Illimité'}</td>
                  <td className="py-2">{c.usages} / {c.usages_max}</td>
                  <td className="py-2 text-gray-500">{c.note || '—'}</td>
                  <td className="py-2">{c.actif ? <span className="text-green-600">Actif</span> : <span className="text-gray-400">Désactivé</span>}</td>
                  <td className="py-2">
                    <button onClick={() => basculer(c.id, !c.actif)} className="btn-ghost text-xs py-1 px-2">
                      {c.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
