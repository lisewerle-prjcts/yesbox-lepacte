'use client'

import { useState } from 'react'
import { KeyRound, Mail, Trash2, X } from 'lucide-react'
import { adminResetAndSendPassword, adminRenvoyerCodeCouple, adminDeleteUser } from '@/app/actions/admin'

interface User {
  id: string
  email: string
  nom: string | null
  prenom: string | null
  createdAt: string
  coupleNumero: number | null
  hasCouple: boolean
}

export default function UtilisateursClient({ users }: { users: User[] }) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [passwordShown, setPasswordShown] = useState<Record<string, { password: string; emailed: boolean }>>({})
  const [codeStatus, setCodeStatus] = useState<Record<string, 'sent' | 'error'>>({})
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function run(key: string, fn: () => Promise<void>) {
    setLoading(l => ({ ...l, [key]: true }))
    await fn()
    setLoading(l => ({ ...l, [key]: false }))
  }

  async function resendPassword(user: User) {
    await run(`pwd-${user.id}`, async () => {
      const res = await adminResetAndSendPassword(user.id)
      if (res.success) setPasswordShown(p => ({ ...p, [user.id]: { password: res.password!, emailed: !!res.emailed } }))
    })
  }

  async function resendCode(user: User) {
    await run(`code-${user.id}`, async () => {
      const res = await adminRenvoyerCodeCouple(user.id)
      setCodeStatus(s => ({ ...s, [user.id]: res.error ? 'error' : 'sent' }))
      setTimeout(() => setCodeStatus(s => ({ ...s, [user.id]: undefined as unknown as 'sent' })), 3000)
    })
  }

  async function confirmDeleteUser() {
    if (!confirmDelete) return
    setDeleting(true)
    await adminDeleteUser(confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
  }

  return (
    <div className="card p-5">
      {users.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun utilisateur inscrit pour l&apos;instant.</p>
      ) : (
        <div className="space-y-2">
          {users.map(user => {
            const shown = passwordShown[user.id]
            const nomComplet = [user.prenom, user.nom].filter(Boolean).join(' ') || '—'
            return (
              <div key={user.id} className="surface p-3 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {nomComplet}{' '}
                    {user.coupleNumero != null
                      ? <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(Couple {user.coupleNumero})</span>
                      : <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(sans couple)</span>}
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{user.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Inscrit·e le {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {shown && (
                    <div className="mt-1 flex items-center gap-2" style={{ fontSize: 11 }}>
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{shown.password}</span>
                      <span style={{ color: 'var(--muted)' }}>
                        {shown.emailed ? <><Mail className="w-3 h-3 inline mr-1" />envoyé par email</> : 'email non configuré — copie ce mot de passe'}
                      </span>
                    </div>
                  )}
                  {codeStatus[user.id] === 'sent' && <p style={{ fontSize: 11, color: 'var(--sage)' }} className="mt-1">Code envoyé par email</p>}
                  {codeStatus[user.id] === 'error' && <p style={{ fontSize: 11, color: '#dc2626' }} className="mt-1">Erreur — vérifie que l&apos;email est configuré</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {user.hasCouple && (
                    <button
                      disabled={loading[`code-${user.id}`]}
                      onClick={() => resendCode(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)', opacity: loading[`code-${user.id}`] ? 0.5 : 1 }}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {loading[`code-${user.id}`] ? 'Envoi…' : 'Renvoyer le code couple'}
                    </button>
                  )}
                  <button
                    disabled={loading[`pwd-${user.id}`]}
                    onClick={() => resendPassword(user)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)', opacity: loading[`pwd-${user.id}`] ? 0.5 : 1 }}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {loading[`pwd-${user.id}`] ? 'Envoi…' : 'Réinitialiser le mot de passe'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(user)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--ink)' }}>Supprimer cet utilisateur ?</h2>
              <button onClick={() => !deleting && setConfirmDelete(null)}><X className="w-5 h-5" style={{ color: 'var(--muted)' }} /></button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
              <strong>{[confirmDelete.prenom, confirmDelete.nom].filter(Boolean).join(' ') || confirmDelete.email}</strong> ({confirmDelete.email}) sera définitivement supprimé·e, avec toutes ses données. Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="btn-secondary text-sm py-2 px-4">Annuler</button>
              <button onClick={confirmDeleteUser} disabled={deleting} className="text-sm py-2 px-4 rounded-lg font-medium" style={{ background: '#dc2626', color: 'white' }}>
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
