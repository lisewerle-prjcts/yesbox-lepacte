'use client'

import { useState } from 'react'
import { KeyRound, UserMinus, UserPlus, Check, Mail } from 'lucide-react'
import {
  adminAssignMemberToCouple, adminUnassignMember, adminCreateEmptyCouple, adminResetAndSendPassword,
} from '@/app/actions/admin'

interface Member { id: string; prenom: string | null; email: string; couple_id: string | null; role: string | null }
interface Couple { id: string; numero: number; pairing_code: string | null; created_at: string; members: Member[] }

export default function SecuriteClient({
  couples,
  unassigned,
}: {
  couples: Couple[]
  unassigned: Member[]
}) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [passwordShown, setPasswordShown] = useState<Record<string, { password: string; emailed: boolean }>>({})
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({})

  async function run(key: string, fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(l => ({ ...l, [key]: true }))
    const res = await fn()
    setLoading(l => ({ ...l, [key]: false }))
    if (!res.error) {
      setDone(d => ({ ...d, [key]: true }))
      setTimeout(() => setDone(d => ({ ...d, [key]: false })), 2500)
    }
    return res
  }

  async function sendPassword(member: Member) {
    const key = `pwd-${member.id}`
    setLoading(l => ({ ...l, [key]: true }))
    const res = await adminResetAndSendPassword(member.id)
    setLoading(l => ({ ...l, [key]: false }))
    if (res.success) {
      setPasswordShown(p => ({ ...p, [member.id]: { password: res.password!, emailed: !!res.emailed } }))
    }
  }

  async function assignMember(member: Member) {
    const key = `assign-${member.id}`
    const target = assignTarget[member.id]
    if (!target) return
    setLoading(l => ({ ...l, [key]: true }))
    let coupleId = target
    if (target === 'new') {
      const created = await adminCreateEmptyCouple()
      if (created.error || !created.coupleId) {
        setLoading(l => ({ ...l, [key]: false }))
        return
      }
      coupleId = created.coupleId
    }
    await run(key, () => adminAssignMemberToCouple(member.id, coupleId))
  }

  return (
    <div className="space-y-6">
      {/* Membres sans couple */}
      <div className="card p-5">
        <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Membres non pairés</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Affecte manuellement un membre à un couple existant (par numéro) ou crée un nouveau couple.
        </p>
        {unassigned.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Tout le monde est pairé. 🎉</p>
        ) : (
          <div className="space-y-3">
            {unassigned.map(member => {
              const key = `assign-${member.id}`
              return (
                <div key={member.id} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{member.prenom || '—'}</div>
                    <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{member.email}</div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      className="field"
                      style={{ width: 200 }}
                      value={assignTarget[member.id] || ''}
                      onChange={e => setAssignTarget(t => ({ ...t, [member.id]: e.target.value }))}
                    >
                      <option value="">Choisir un couple…</option>
                      {couples.map(c => (
                        <option key={c.id} value={c.id} disabled={c.members.length >= 2}>
                          Couple {c.numero} {c.members.length >= 2 ? '(complet)' : `(${c.members.length}/2)`}
                        </option>
                      ))}
                      <option value="new">+ Créer un nouveau couple</option>
                    </select>
                    <button
                      disabled={!assignTarget[member.id] || loading[key]}
                      onClick={() => assignMember(member)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)', color: 'var(--brand)', opacity: (!assignTarget[member.id] || loading[key]) ? 0.5 : 1 }}
                    >
                      {done[key] ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      {done[key] ? 'Affecté' : 'Affecter'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Couples & pairage */}
      <div className="card p-5">
        <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Couples</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Numérotation interne (visible uniquement par l&apos;admin) et code de pairage à 6 caractères.
        </p>
        <div className="space-y-4">
          {couples.map(couple => (
            <div key={couple.id} className="surface p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="tag-brand" style={{ fontSize: 11 }}>Couple {couple.numero}</span>
                  {couple.pairing_code && (
                    <span className="font-mono flex items-center gap-1" style={{ fontSize: 12, color: 'var(--muted)' }}>
                      <KeyRound className="w-3 h-3" /> {couple.pairing_code}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{couple.members.length}/2 membres</span>
              </div>

              {couple.members.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Aucun membre affecté pour l&apos;instant.</p>
              ) : (
                <div className="space-y-2">
                  {couple.members.map(member => {
                    const pwdKey = `pwd-${member.id}`
                    const unassignKey = `unassign-${member.id}`
                    const shown = passwordShown[member.id]
                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 flex-wrap py-2" style={{ borderTop: '1px solid var(--line)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {member.prenom || '—'} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>({member.role || 'membre'})</span>
                          </div>
                          <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{member.email}</div>
                          {shown && (
                            <div className="mt-1 flex items-center gap-2" style={{ fontSize: 11 }}>
                              <span className="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{shown.password}</span>
                              <span style={{ color: 'var(--muted)' }}>{shown.emailed ? <><Mail className="w-3 h-3 inline mr-1" />envoyé par email</> : 'email non configuré — copie ce mot de passe'}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            disabled={loading[pwdKey]}
                            onClick={() => sendPassword(member)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)', opacity: loading[pwdKey] ? 0.5 : 1 }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {loading[pwdKey] ? 'Envoi…' : 'Envoyer un nouveau mot de passe'}
                          </button>
                          <button
                            disabled={loading[unassignKey]}
                            onClick={() => run(unassignKey, () => adminUnassignMember(member.id))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626', opacity: loading[unassignKey] ? 0.5 : 1 }}
                          >
                            {done[unassignKey] ? <Check className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                            {done[unassignKey] ? 'Retiré' : 'Retirer du couple'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
