'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, RefreshCw, Link2, Unlink, Trash2 } from 'lucide-react'
import {
  adminUpdatePrecommande, adminSetCoupleCode, adminRegenerateCoupleCode,
  adminPairPrecommandes, adminUnpairPrecommande, adminDeletePrecommande,
} from '@/app/actions/admin'
import type { Precommande } from '@/types'

export default function PrecommandesManager({ precommandes }: { precommandes: Precommande[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Precommande>>({})
  const [codeEditingId, setCodeEditingId] = useState<string | null>(null)
  const [codeValue, setCodeValue] = useState('')
  const [pairTarget, setPairTarget] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function byId(id: string) {
    return precommandes.find(p => p.id === id)
  }

  async function run(key: string, fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(l => ({ ...l, [key]: true }))
    setError(e => ({ ...e, [key]: '' }))
    const res = await fn()
    setLoading(l => ({ ...l, [key]: false }))
    if (res.error) {
      setError(e => ({ ...e, [key]: res.error! }))
      return false
    }
    router.refresh()
    return true
  }

  function startEdit(p: Precommande) {
    setEditingId(p.id)
    setEditForm({ prenom: p.prenom, nom: p.nom, email: p.email, adresse: p.adresse, partenaire_prenom: p.partenaire_prenom, message: p.message })
  }

  async function saveEdit(id: string) {
    const ok = await run(`edit-${id}`, () => adminUpdatePrecommande(id, editForm))
    if (ok) setEditingId(null)
  }

  async function saveCode(id: string) {
    const ok = await run(`code-${id}`, () => adminSetCoupleCode(id, codeValue))
    if (ok) setCodeEditingId(null)
  }

  async function pair(id: string) {
    const target = pairTarget[id]
    if (!target) return
    await run(`pair-${id}`, () => adminPairPrecommandes(id, target))
  }

  if (!precommandes.length) {
    return <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>Aucune inscription pour l&apos;instant.</div>
  }

  return (
    <div className="space-y-3">
      {precommandes.map(p => {
        const partner = p.paired_with ? byId(p.paired_with) : null
        const available = precommandes.filter(o => o.id !== p.id && (!o.paired_with || o.paired_with === p.id))
        const isEditing = editingId === p.id
        const isCodeEditing = codeEditingId === p.id

        return (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2 mb-2" style={{ maxWidth: 420 }}>
                    <input className="field" style={{ padding: '6px 10px', fontSize: 13 }} value={editForm.prenom || ''} onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" />
                    <input className="field" style={{ padding: '6px 10px', fontSize: 13 }} value={editForm.nom || ''} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom" />
                    <input className="field col-span-2" style={{ padding: '6px 10px', fontSize: 13 }} value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
                    <input className="field col-span-2" style={{ padding: '6px 10px', fontSize: 13 }} value={editForm.partenaire_prenom || ''} onChange={e => setEditForm(f => ({ ...f, partenaire_prenom: e.target.value }))} placeholder="Prénom du binôme" />
                    <input className="field col-span-2" style={{ padding: '6px 10px', fontSize: 13 }} value={editForm.adresse || ''} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Ville / Pays" />
                  </div>
                ) : (
                  <>
                    <div className="font-semibold" style={{ fontSize: 15 }}>{p.prenom} {p.nom}</div>
                    <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</div>
                    {p.adresse && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.adresse}</div>}
                    {p.partenaire_prenom && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Binôme indiqué : {p.partenaire_prenom}</div>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {isEditing ? (
                  <>
                    <button disabled={loading[`edit-${p.id}`]} onClick={() => saveEdit(p.id)} className="p-1.5 rounded-lg" style={{ background: 'var(--sage-soft)', color: 'var(--sage)' }}><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg" style={{ background: 'var(--paper)', color: 'var(--muted)' }}><X className="w-3.5 h-3.5" /></button>
                  </>
                ) : (
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}><Pencil className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
            {error[`edit-${p.id}`] && <div className="alert-error mb-2" style={{ fontSize: 12 }}>{error[`edit-${p.id}`]}</div>}

            <div className="flex items-center gap-3 flex-wrap pt-2 mt-2" style={{ borderTop: '1px solid var(--line)' }}>
              {/* Code couple */}
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Code :</span>
                {isCodeEditing ? (
                  <>
                    <input
                      className="field uppercase"
                      style={{ padding: '4px 8px', fontSize: 12, width: 90, fontFamily: 'monospace' }}
                      maxLength={5}
                      value={codeValue}
                      onChange={e => setCodeValue(e.target.value.toUpperCase())}
                    />
                    <button disabled={loading[`code-${p.id}`]} onClick={() => saveCode(p.id)} className="p-1 rounded" style={{ background: 'var(--sage-soft)', color: 'var(--sage)' }}><Check className="w-3 h-3" /></button>
                    <button onClick={() => setCodeEditingId(null)} className="p-1 rounded" style={{ background: 'var(--paper)', color: 'var(--muted)' }}><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <>
                    <span className="font-mono font-bold" style={{ fontSize: 13, color: 'var(--brand)', letterSpacing: '.06em' }}>{p.couple_code || '—'}</span>
                    <button onClick={() => { setCodeEditingId(p.id); setCodeValue(p.couple_code || '') }} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--ink-2)', border: '1px solid var(--line)' }}>Changer</button>
                    <button
                      disabled={loading[`regen-${p.id}`]}
                      onClick={() => run(`regen-${p.id}`, () => adminRegenerateCoupleCode(p.id))}
                      className="p-1 rounded"
                      style={{ color: 'var(--muted)' }}
                      title="Régénérer le code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              {error[`code-${p.id}`] && <span className="alert-error" style={{ fontSize: 11, padding: '2px 8px' }}>{error[`code-${p.id}`]}</span>}

              <span style={{ color: 'var(--line)' }}>·</span>

              {/* Pairing */}
              {partner ? (
                <div className="flex items-center gap-1.5">
                  <span className="tag-sage" style={{ fontSize: 11 }}>Associé·e à {partner.prenom} {partner.nom}</span>
                  <button disabled={loading[`unpair-${p.id}`]} onClick={() => run(`unpair-${p.id}`, () => adminUnpairPrecommande(p.id))} className="p-1 rounded" style={{ color: 'var(--muted)' }} title="Dissocier">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    className="field"
                    style={{ padding: '4px 8px', fontSize: 12, width: 180 }}
                    value={pairTarget[p.id] || ''}
                    onChange={e => setPairTarget(t => ({ ...t, [p.id]: e.target.value }))}
                  >
                    <option value="">Pairer avec…</option>
                    {available.map(o => (
                      <option key={o.id} value={o.id}>{o.prenom} {o.nom} — {o.couple_code}</option>
                    ))}
                  </select>
                  <button
                    disabled={!pairTarget[p.id] || loading[`pair-${p.id}`]}
                    onClick={() => pair(p.id)}
                    className="p-1.5 rounded-lg"
                    style={{ background: 'var(--brand-tint)', color: 'var(--brand)', opacity: pairTarget[p.id] ? 1 : 0.4 }}
                    title="Associer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {error[`pair-${p.id}`] && <span className="alert-error" style={{ fontSize: 11, padding: '2px 8px' }}>{error[`pair-${p.id}`]}</span>}

              <span className="ml-auto" />

              {/* Delete */}
              {confirmDelete === p.id ? (
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 11, color: '#dc2626' }}>Supprimer définitivement ?</span>
                  <button disabled={loading[`delete-${p.id}`]} onClick={() => run(`delete-${p.id}`, () => adminDeletePrecommande(p.id))} className="text-xs px-2 py-1 rounded font-medium" style={{ background: '#dc2626', color: 'white' }}>Confirmer</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--muted)' }}>Annuler</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 rounded-lg" style={{ color: '#dc2626' }} title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {p.message && !isEditing && (
              <p className="mt-2 pt-2" style={{ fontSize: 12, color: 'var(--ink-2)', fontStyle: 'italic', borderTop: '1px solid var(--line)' }}>&laquo; {p.message} &raquo;</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
