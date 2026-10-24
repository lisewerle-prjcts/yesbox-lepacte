'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, KeyRound, LockOpen, Mail, MailCheck, Search, Ticket, Trash2, X } from 'lucide-react'
import { adminAttribuerCode, adminResetAndSendPassword, adminRenvoyerBienvenue, adminRenvoyerConfirmation, adminConfirmerEmail, adminDeleteUser, adminDebloquerConnexion } from '@/app/actions/admin'

interface User {
  id: string
  email: string
  nom: string | null
  prenom: string | null
  createdAt: string
  coupleNumero: number | null
  hasCouple: boolean
  emailConfirme: boolean
  code: string | null
  derniereConnexion: string | null
  /** A enregistré au moins une réponse à un module. */
  aCommence: boolean
  /** Connexion bloquée en ce moment après trop d'essais de mot de passe. */
  bloque: boolean
  /** Fin de l'accès offert au couple (code gratuit, carte cadeau, parrainage). */
  finAcces: string | null
}

interface CodeDisponible { code: string; restants: number }

// Recherche sans tenir compte des majuscules ni des accents.
function normaliser(texte: string) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Tout ce qui permet de retrouver une personne : prénom, nom, e-mail, numéro
// de couple et date d'inscription sous plusieurs formes (17/10/2026,
// 17 octobre 2026, 2026-10-17).
function texteRecherche(user: User) {
  const d = new Date(user.createdAt)
  const jj = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return normaliser([
    user.prenom, user.nom, user.email, user.code,
    user.coupleNumero != null ? `couple ${user.coupleNumero}` : 'sans couple',
    `${jj}/${mm}/${d.getFullYear()}`,
    `${d.getFullYear()}-${mm}-${jj}`,
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  ].filter(Boolean).join(' '))
}

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Fin de l'accès offert : date, « illimité » (2999), ou « terminé » si passée.
function FinAcces({ iso }: { iso: string }) {
  const fin = new Date(iso)
  if (fin.getFullYear() >= 2999) return <span>— illimité</span>
  if (fin.getTime() < Date.now()) return <span style={{ color: '#b45309' }}>— terminé le {dateLongue(iso)}</span>
  return <span>— jusqu’au {dateLongue(iso)}</span>
}

export default function UtilisateursClient({ users, codesDisponibles }: { users: User[]; codesDisponibles: CodeDisponible[] }) {
  const router = useRouter()
  const [recherche, setRecherche] = useState('')
  const [codeOuvert, setCodeOuvert] = useState<string | null>(null)
  const [codeChoisi, setCodeChoisi] = useState('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [passwordShown, setPasswordShown] = useState<Record<string, { password: string; emailed: boolean }>>({})
  const [mailStatus, setMailStatus] = useState<Record<string, { ok: boolean; message: string } | undefined>>({})
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const index = useMemo(() => users.map(user => ({ user, texte: texteRecherche(user) })), [users])
  // Chaque mot saisi doit apparaître (ex : « marie octobre »).
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean)
  const usersFiltres = mots.length ? index.filter(({ texte }) => mots.every(m => texte.includes(m))).map(({ user }) => user) : users

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

  function showStatus(user: User, ok: boolean, message: string) {
    setMailStatus(s => ({ ...s, [user.id]: { ok, message } }))
    setTimeout(() => setMailStatus(s => ({ ...s, [user.id]: undefined })), 5000)
  }

  async function resendWelcome(user: User) {
    await run(`bienvenue-${user.id}`, async () => {
      const res = await adminRenvoyerBienvenue(user.id)
      showStatus(user, !res.error, res.error ? `Erreur — ${res.error}` : 'Mail de bienvenue envoyé')
    })
  }

  async function debloquer(user: User) {
    await run(`debloquer-${user.id}`, async () => {
      const res = await adminDebloquerConnexion(user.email.toLowerCase())
      showStatus(user, !res.error, res.error ? `Erreur — ${res.error}` : 'Connexion débloquée : la personne peut réessayer tout de suite')
      if (!res.error) router.refresh()
    })
  }

  async function resendConfirmation(user: User) {
    await run(`confirm-${user.id}`, async () => {
      const res = await adminRenvoyerConfirmation(user.id)
      showStatus(user, !res.error, res.error ? `Erreur — ${res.error}` : 'Mail de confirmation renvoyé')
    })
  }

  async function confirmerManuellement(user: User) {
    await run(`confirm-manuel-${user.id}`, async () => {
      const res = await adminConfirmerEmail(user.id)
      showStatus(user, !res.error, res.error ? `Erreur — ${res.error}` : 'Adresse confirmée : la personne peut se connecter')
    })
  }

  async function attribuerCode(user: User) {
    await run(`code-${user.id}`, async () => {
      let res = await adminAttribuerCode(user.id, codeChoisi)
      if ('codeExistant' in res && res.codeExistant) {
        if (!window.confirm(`Le couple a déjà le code ${res.codeExistant}. Le remplacer par ${codeChoisi} ?`)) return
        res = await adminAttribuerCode(user.id, codeChoisi, true)
      }
      showStatus(user, !res.error, res.error ? `Erreur — ${res.error}` : `Code ${codeChoisi} attribué`)
      if (!res.error) {
        setCodeOuvert(null)
        setCodeChoisi('')
        router.refresh()
      }
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
        <>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            type="search"
            className="field pl-9 pr-9"
            placeholder="Rechercher par prénom, nom, e-mail ou date (ex : 17/10, octobre 2026)"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            aria-label="Rechercher un utilisateur"
          />
          {recherche && (
            <button type="button" onClick={() => setRecherche('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Effacer la recherche">
              <X className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            </button>
          )}
        </div>
        {mots.length > 0 && (
          <p className="mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {usersFiltres.length} résultat{usersFiltres.length > 1 ? 's' : ''} sur {users.length}
          </p>
        )}
        {usersFiltres.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun utilisateur ne correspond à cette recherche.</p>
        )}
        <div className="space-y-2">
          {usersFiltres.map(user => {
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
                    Inscrit·e le {dateLongue(user.createdAt)}
                    {' · '}
                    {user.derniereConnexion
                      ? <>Dernière connexion le {dateLongue(user.derniereConnexion)}</>
                      : <span style={{ color: '#b45309' }}>jamais connecté·e</span>}
                  </div>
                  {shown && (
                    <div className="mt-1 flex items-center gap-2" style={{ fontSize: 11 }}>
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{shown.password}</span>
                      <span style={{ color: 'var(--muted)' }}>
                        {shown.emailed ? <><Mail className="w-3 h-3 inline mr-1" />envoyé par email</> : 'email non configuré — copie ce mot de passe'}
                      </span>
                    </div>
                  )}
                  {user.code && (
                    <div className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--sage)' }}>
                      <Ticket className="w-3 h-3" /> Code <span className="font-mono">{user.code}</span>
                      {user.finAcces && <FinAcces iso={user.finAcces} />}
                    </div>
                  )}
                  {!user.code && user.finAcces && (
                    <div className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--sage)' }}>
                      <Ticket className="w-3 h-3" /> Accès offert <FinAcces iso={user.finAcces} />
                    </div>
                  )}
                  {codeOuvert === user.id && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <select className="field" style={{ width: 220 }} value={codeChoisi} onChange={e => setCodeChoisi(e.target.value)}>
                        <option value="">Choisir un code…</option>
                        {codesDisponibles.map(c => (
                          <option key={c.code} value={c.code} disabled={c.restants <= 0}>
                            {c.code} — {c.restants > 0 ? `${c.restants} utilisation${c.restants > 1 ? 's' : ''} restante${c.restants > 1 ? 's' : ''}` : 'épuisé'}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!codeChoisi || loading[`code-${user.id}`]}
                        onClick={() => attribuerCode(user)}
                        className="btn-brand text-xs py-2 px-3"
                        style={{ opacity: !codeChoisi || loading[`code-${user.id}`] ? 0.5 : 1 }}
                      >
                        {loading[`code-${user.id}`] ? 'Attribution…' : 'Attribuer'}
                      </button>
                    </div>
                  )}
                  {!user.emailConfirme && <div style={{ fontSize: 11, color: '#b45309' }}>Adresse e-mail pas encore confirmée</div>}
                  {user.bloque && <div style={{ fontSize: 11, color: '#b45309' }}>Connexion bloquée 15 minutes après trop d’essais de mot de passe</div>}
                  {mailStatus[user.id] && <p style={{ fontSize: 11, color: mailStatus[user.id]!.ok ? 'var(--sage)' : '#dc2626' }} className="mt-1">{mailStatus[user.id]!.message}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!user.emailConfirme && (
                    <button
                      disabled={loading[`confirm-${user.id}`]}
                      onClick={() => resendConfirmation(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)', opacity: loading[`confirm-${user.id}`] ? 0.5 : 1 }}
                    >
                      <MailCheck className="w-3.5 h-3.5" />
                      {loading[`confirm-${user.id}`] ? 'Envoi…' : 'Renvoyer le mail de confirmation'}
                    </button>
                  )}
                  {!user.emailConfirme && (
                    <button
                      disabled={loading[`confirm-manuel-${user.id}`]}
                      onClick={() => confirmerManuellement(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--sage)', opacity: loading[`confirm-manuel-${user.id}`] ? 0.5 : 1 }}
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      {loading[`confirm-manuel-${user.id}`] ? 'Confirmation…' : 'Confirmer l\'adresse manuellement'}
                    </button>
                  )}
                  {user.bloque && (
                    <button
                      disabled={loading[`debloquer-${user.id}`]}
                      onClick={() => debloquer(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#b45309', opacity: loading[`debloquer-${user.id}`] ? 0.5 : 1 }}
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      {loading[`debloquer-${user.id}`] ? 'Déblocage…' : 'Débloquer la connexion'}
                    </button>
                  )}
                  {/* Utile tant que la personne n'a pas commencé son premier
                      module ; ensuite, elle n'en a plus besoin. */}
                  {user.hasCouple && !user.aCommence && (
                    <button
                      disabled={loading[`bienvenue-${user.id}`]}
                      onClick={() => resendWelcome(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)', opacity: loading[`bienvenue-${user.id}`] ? 0.5 : 1 }}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {loading[`bienvenue-${user.id}`] ? 'Envoi…' : 'Renvoyer le mail de bienvenue'}
                    </button>
                  )}
                  {user.hasCouple && (
                    <button
                      onClick={() => { setCodeOuvert(o => (o === user.id ? null : user.id)); setCodeChoisi('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--sage)' }}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      {user.code ? 'Changer le code' : 'Attribuer un code'}
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
        </>
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
