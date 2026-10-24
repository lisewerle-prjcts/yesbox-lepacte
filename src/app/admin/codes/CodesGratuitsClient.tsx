'use client'

import { useState } from 'react'
import { adminCreerCodeGratuit, adminBasculerCodeGratuit, adminModifierUsagesMaxCode, adminModifierDureeCode } from '@/app/actions/admin'

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

function UsagesMax({ code, onModifie }: { code: CodeGratuit; onModifie: (usagesMax: number) => void }) {
  const [valeur, setValeur] = useState(String(code.usages_max))
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState('')
  const modifie = Number(valeur) !== code.usages_max

  async function enregistrer() {
    setErreur('')
    setEnregistrement(true)
    const res = await adminModifierUsagesMaxCode(code.id, Number(valeur))
    setEnregistrement(false)
    if (res.error) { setErreur(res.error); return }
    onModifie(Number(valeur))
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span>{code.usages} /</span>
        <input
          type="number"
          min={Math.max(1, code.usages)}
          className="field py-1 px-2"
          style={{ width: 72 }}
          value={valeur}
          onChange={e => setValeur(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && modifie && enregistrer()}
          aria-label={`Nombre max d'utilisations du code ${code.code}`}
        />
        {modifie && (
          <button onClick={enregistrer} disabled={enregistrement} className="btn-primary text-xs py-1 px-2">
            {enregistrement ? '…' : 'OK'}
          </button>
        )}
      </div>
      {erreur && <p className="text-xs text-red-600 mt-1">{erreur}</p>}
    </div>
  )
}

// Durée du code (mois, vide = illimité). Si des couples l'ont déjà utilisé,
// on demande si leur date de fin d'accès change aussi.
function Duree({ code, onModifie }: { code: CodeGratuit; onModifie: (dureeMois: number | null) => void }) {
  const [valeur, setValeur] = useState(code.duree_mois ? String(code.duree_mois) : '')
  const [choix, setChoix] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const nouvelle = valeur.trim() ? Number(valeur) : null
  const modifie = nouvelle !== code.duree_mois

  async function enregistrer(appliquerAuxCouples: boolean) {
    setMessage(null)
    setEnregistrement(true)
    const res = await adminModifierDureeCode(code.id, nouvelle, appliquerAuxCouples)
    setEnregistrement(false)
    setChoix(false)
    if (res.error) { setMessage({ ok: false, texte: res.error }); return }
    onModifie(nouvelle)
    setMessage({ ok: true, texte: appliquerAuxCouples
      ? `Enregistré : fin d’accès mise à jour pour ${res.couplesModifies} couple${(res.couplesModifies ?? 0) > 1 ? 's' : ''}.`
      : 'Enregistré pour les prochaines utilisations.' })
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          className="field py-1 px-2"
          style={{ width: 72 }}
          value={valeur}
          placeholder="∞"
          onChange={e => { setValeur(e.target.value); setChoix(false); setMessage(null) }}
          onKeyDown={e => e.key === 'Enter' && modifie && (code.usages ? setChoix(true) : enregistrer(false))}
          aria-label={`Durée en mois du code ${code.code}`}
        />
        <span className="text-xs text-gray-500">{nouvelle ? 'mois' : 'illimité'}</span>
        {modifie && !choix && (
          <button onClick={() => (code.usages ? setChoix(true) : enregistrer(false))} disabled={enregistrement} className="btn-primary text-xs py-1 px-2">
            {enregistrement ? '…' : 'OK'}
          </button>
        )}
      </div>
      {choix && (
        <div className="mt-1.5 text-xs space-y-1" style={{ maxWidth: 280 }}>
          <p className="text-gray-500">{code.usages} couple{code.usages > 1 ? 's ont' : ' a'} déjà utilisé ce code. Leur accès change-t-il aussi ?</p>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => enregistrer(false)} disabled={enregistrement} className="btn-ghost text-xs py-1 px-2">Prochains seulement</button>
            <button onClick={() => enregistrer(true)} disabled={enregistrement} className="btn-primary text-xs py-1 px-2">Aussi pour {code.usages > 1 ? `ces ${code.usages} couples` : 'ce couple'}</button>
          </div>
        </div>
      )}
      {message && <p className={`text-xs mt-1 ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.texte}</p>}
    </div>
  )
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
      id: res.id ?? crypto.randomUUID(), code: res.code!, duree_mois: dureeMois ? Number(dureeMois) : null,
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
                  <td className="py-2">
                    <Duree code={c} onModifie={dureeMois => setCodes(cs => cs.map(x => x.id === c.id ? { ...x, duree_mois: dureeMois } : x))} />
                  </td>
                  <td className="py-2">
                    <UsagesMax code={c} onModifie={usagesMax => setCodes(cs => cs.map(x => x.id === c.id ? { ...x, usages_max: usagesMax } : x))} />
                  </td>
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
