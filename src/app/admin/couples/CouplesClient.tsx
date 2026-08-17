'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, UserPlus, UserMinus, KeyRound } from 'lucide-react'
import {
  adminAssignMemberToCouple, adminUnassignMember, adminCreateEmptyCouple,
  adminUpdateCouple, adminDeleteCouple,
} from '@/app/actions/admin'

interface UnassignedMember { id: string; prenom: string | null; email: string; role: string | null }
interface MemberProgress { id: string; prenom: string | null; email: string; role: string | null; modulesCompleted: number }
interface ModuleStatus { slug: string; statut: string; revealed: boolean; connivence_score: number | null }
interface Couple {
  id: string
  numero: number
  pairing_code: string | null
  nom_couple: string | null
  date_anniversaire: string | null
  created_at: string
  members: MemberProgress[]
  modules: ModuleStatus[]
}

const SLUGS = ['moi', 'toi', 'nous', 'communication', 'conflits', 'engagement', 'renouvellement']
const LABELS: Record<string, string> = { moi: 'M1', toi: 'M2', nous: 'M3', communication: 'M4', conflits: 'M5', engagement: 'M6', renouvellement: 'M7' }
const STATUS_COLOR: Record<string, string> = { locked: '#e6dfd1', en_cours: '#fceef4', complete: '#e2ece4', revealed: 'var(--sage)' }
const STATUS_TEXT: Record<string, string> = { locked: '🔒', en_cours: '✏️', complete: '✓', revealed: '★' }

export default function CouplesClient({
  couples,
  unassigned,
  totalModules,
}: {
  couples: Couple[]
  unassigned: UnassignedMember[]
  totalModules: number
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function addCouple() {
    setAdding(true)
    setAddError(null)
    const res = await adminCreateEmptyCouple()
    setAdding(false)
    if (res.error) { setAddError(res.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <button onClick={addCouple} disabled={adding} className="btn-brand text-sm py-2 px-4 flex items-center gap-2" style={{ opacity: adding ? 0.6 : 1 }}>
          <Plus className="w-4 h-4" /> {adding ? 'Création…' : 'Ajouter un couple'}
        </button>
        {addError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{addError}</p>}
      </div>

      {couples.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun couple pour l&apos;instant.</div>
      ) : (
        couples.map(couple => (
          <CoupleCard key={couple.id} couple={couple} unassigned={unassigned} totalModules={totalModules} />
        ))
      )}
    </div>
  )
}

function CoupleCard({
  couple,
  unassigned,
  totalModules,
}: {
  couple: Couple
  unassigned: UnassignedMember[]
  totalModules: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [nomCouple, setNomCouple] = useState(couple.nom_couple || '')
  const [dateAnniversaire, setDateAnniversaire] = useState(couple.date_anniversaire || '')
  const [saving, setSaving] = useState(false)
  const [assignChoice, setAssignChoice] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setSaving(true)
    await adminUpdateCouple(couple.id, { nom_couple: nomCouple || null, date_anniversaire: dateAnniversaire || null })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(`Supprimer le Couple ${couple.numero} ? Cette action retire ses membres et efface sa progression.`)) return
    setBusy(true)
    await adminDeleteCouple(couple.id)
    setBusy(false)
    router.refresh()
  }

  async function unassign(memberId: string) {
    setBusy(true)
    await adminUnassignMember(memberId)
    setBusy(false)
    router.refresh()
  }

  async function assign() {
    if (!assignChoice) return
    setBusy(true)
    await adminAssignMemberToCouple(assignChoice, couple.id)
    setBusy(false)
    setAssignChoice('')
    router.refresh()
  }

  const emptySlots = Math.max(0, 2 - couple.members.length)

  return (
    <div className="card p-5" style={{ opacity: busy ? 0.6 : 1 }}>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="tag-brand" style={{ fontSize: 11 }}>Couple {couple.numero}</span>
          {couple.pairing_code && (
            <span className="font-mono flex items-center gap-1" style={{ fontSize: 11, color: 'var(--muted)' }}>
              <KeyRound className="w-3 h-3" /> {couple.pairing_code}
            </span>
          )}
          {couple.nom_couple && <span style={{ fontSize: 13, fontWeight: 600 }}>{couple.nom_couple}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            Créé le {new Date(couple.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setEditing(e => !e)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
          <button onClick={remove} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626' }}>
            <Trash2 className="w-3.5 h-3.5" /> Effacer
          </button>
        </div>
      </div>

      {editing && (
        <div className="surface p-3 mb-4 flex flex-wrap gap-3 items-end">
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="flabel">Nom du couple</label>
            <input type="text" className="field" value={nomCouple} onChange={e => setNomCouple(e.target.value)} placeholder="Ex : Lise & Jérôme" />
          </div>
          <div>
            <label className="flabel">Date d&apos;anniversaire</label>
            <input type="date" className="field" value={dateAnniversaire} onChange={e => setDateAnniversaire(e.target.value)} />
          </div>
          <button onClick={save} disabled={saving} className="btn-brand text-xs py-2 px-3">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Membres */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {couple.members.map(member => (
          <div key={member.id} className="surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {member.prenom || '—'} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>({member.role || 'membre'})</span>
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{member.email}</div>
                <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4 }}>{member.modulesCompleted}/{totalModules} modules terminés</div>
              </div>
              <button onClick={() => unassign(member.id)} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs flex-shrink-0" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626' }}>
                <UserMinus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="surface p-3 flex items-center gap-2" style={{ borderStyle: 'dashed' }}>
            <select className="field" style={{ flex: 1 }} value={assignChoice} onChange={e => setAssignChoice(e.target.value)}>
              <option value="">Choisir un utilisateur…</option>
              {unassigned.map(u => (
                <option key={u.id} value={u.id}>{u.prenom || '—'} — {u.email}</option>
              ))}
            </select>
            <button
              onClick={assign}
              disabled={!assignChoice || busy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
              style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)', color: 'var(--brand)', opacity: (!assignChoice || busy) ? 0.5 : 1 }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Assigner
            </button>
          </div>
        ))}
      </div>

      {/* Grille modules */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {SLUGS.map(slug => {
          const mod = couple.modules.find(m => m.slug === slug)
          const st = mod?.statut || 'locked'
          const bg = mod?.revealed ? STATUS_COLOR.revealed : STATUS_COLOR[st] || STATUS_COLOR.locked
          return (
            <div key={slug} className="rounded-lg p-2 text-center" style={{ background: bg, border: '1px solid rgba(0,0,0,.06)' }}>
              <div className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{LABELS[slug]}</div>
              <div style={{ fontSize: 16 }}>{STATUS_TEXT[mod?.revealed ? 'revealed' : st]}</div>
              {mod?.connivence_score && (
                <div style={{ fontSize: 9, color: 'var(--sage)', marginTop: 2 }}>{'★'.repeat(mod.connivence_score)}</div>
              )}
            </div>
          )
        })}
      </div>

      <Link
        href={`/admin/actions?couple_id=${couple.id}`}
        className="text-xs px-3 py-1.5 rounded-lg font-medium inline-block"
        style={{ background: 'var(--brand-tint)', color: 'var(--brand)', border: '1px solid var(--brand-soft)' }}
      >
        Actions →
      </Link>
    </div>
  )
}
