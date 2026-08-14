'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Mail, Trash2 } from 'lucide-react'
import { adminResetAndSendPassword, adminDeleteUser } from '@/app/actions/admin'

interface Member { id: string; prenom: string | null; email: string; coupleNumero: number | null }

export default function SecuriteClient({ members: initialMembers }: { members: Member[] }) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [passwordShown, setPasswordShown] = useState<Record<string, { password: string; emailed: boolean }>>({})

  async function sendPassword(member: Member) {
    setLoading(l => ({ ...l, [member.id]: true }))
    const res = await adminResetAndSendPassword(member.id)
    setLoading(l => ({ ...l, [member.id]: false }))
    if (res.success) {
      setPasswordShown(p => ({ ...p, [member.id]: { password: res.password!, emailed: !!res.emailed } }))
    }
  }

  async function deleteMember(member: Member) {
    if (!window.confirm(`Supprimer définitivement le compte de ${member.prenom || member.email} (${member.email}) ? Cette action est irréversible : le profil et toutes ses réponses seront effacés.`)) return
    setDeleting(d => ({ ...d, [member.id]: true }))
    const res = await adminDeleteUser(member.id)
    setDeleting(d => ({ ...d, [member.id]: false }))
    if (res.success) {
      setMembers(m => m.filter(x => x.id !== member.id))
      router.refresh()
    } else if (res.error) {
      alert(res.error)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Réinitialiser un mot de passe</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        Génère un nouveau mot de passe et l&apos;envoie par email au membre concerné.
      </p>

      {members.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun membre inscrit pour l&apos;instant.</p>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const shown = passwordShown[member.id]
            return (
              <div key={member.id} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {member.prenom || '—'}{' '}
                    {member.coupleNumero != null
                      ? <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(Couple {member.coupleNumero})</span>
                      : <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(non pairé)</span>}
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{member.email}</div>
                  {shown && (
                    <div className="mt-1 flex items-center gap-2" style={{ fontSize: 11 }}>
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{shown.password}</span>
                      <span style={{ color: 'var(--muted)' }}>
                        {shown.emailed ? <><Mail className="w-3 h-3 inline mr-1" />envoyé par email</> : 'email non configuré — copie ce mot de passe'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={loading[member.id]}
                    onClick={() => sendPassword(member)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)', opacity: loading[member.id] ? 0.5 : 1 }}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {loading[member.id] ? 'Envoi…' : 'Envoyer un nouveau mot de passe'}
                  </button>
                  <button
                    disabled={deleting[member.id]}
                    onClick={() => deleteMember(member)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626', opacity: deleting[member.id] ? 0.5 : 1 }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting[member.id] ? 'Suppression…' : 'Supprimer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
