'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, UserPlus, UserMinus, KeyRound, Search, X, Mail, BellOff, CalendarHeart, ArrowUp, ArrowDown } from 'lucide-react'
import {
  adminAssignMemberToCouple, adminUnassignMember, adminCreateEmptyCouple,
  adminUpdateCouple, adminDeleteCouple, adminUpdateProfile,
} from '@/app/actions/admin'

interface UnassignedMember { id: string; prenom: string | null; nom: string | null; email: string; role: string | null }
interface MemberProgress { id: string; prenom: string | null; nom: string | null; email: string; role: string | null; modulesCompleted: number; derniereConnexion: string | null; rappelsEmail: boolean }
interface ModuleStatus { slug: string; statut: string; revealed: boolean; termine_le: string | null }
export interface EmailEnvoye { date: string; destinataire: string; sujet: string; ok: boolean }
export interface GrandeDateAVenir { type: 'rencontre' | 'mariage' | 'bilan'; le: string; annees: number | null; joursAvant: number; numero: number; nom: string }
const LIBELLE_GRANDE_DATE = { rencontre: 'anniversaire de couple', mariage: 'mariage', bilan: 'bilan annuel' }
interface Couple {
  id: string
  numero: number
  pairing_code: string | null
  nom_couple: string | null
  date_anniversaire: string | null
  date_mariage: string | null
  rdv_annuel_le: string | null
  created_at: string
  derniere_connexion: string | null
  emails: EmailEnvoye[]
  members: MemberProgress[]
  modules: ModuleStatus[]
  rdvAnnuels: { valides: (string | null)[]; enCours: boolean; prevuLe: string | null }
}

const STATUS_COLOR: Record<string, string> = { locked: '#e6dfd1', en_cours: '#fceef4', complete: '#e2ece4', revealed: 'var(--sage)' }
const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
// Date AAAA-MM-JJ lue à midi UTC pour éviter un décalage d'un jour.
const dateJour = (date: string) => dateLongue(`${date.slice(0, 10)}T12:00:00Z`)
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })

// Recherche sans tenir compte des majuscules ni des accents (comme Admin >
// Utilisateurs).
function normaliser(texte: string) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function formesDate(iso: string) {
  const d = new Date(iso)
  const jj = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return [`${jj}/${mm}/${d.getFullYear()}`, `${d.getFullYear()}-${mm}-${jj}`, d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })]
}

// Tout ce qui permet de retrouver un couple : numéro, code, nom, prénoms,
// noms et e-mails des membres, date de création.
function texteRecherche(couple: Couple) {
  return normaliser([
    `couple ${couple.numero}`, couple.pairing_code, couple.nom_couple,
    ...couple.members.flatMap(m => [m.prenom, m.nom, m.email]),
    ...formesDate(couple.created_at),
    ...(couple.date_anniversaire ? formesDate(couple.date_anniversaire) : []),
    ...(couple.date_mariage ? formesDate(couple.date_mariage) : []),
  ].filter(Boolean).join(' '))
}

// Cases « rendez-vous annuel » affichées sous la grille des modules.
const RDV_ANNUELS_AFFICHES = 9

// Tri de la liste : la valeur de chaque couple pour le critère choisi ;
// null (jamais connecté, aucun module terminé) reste toujours en fin de liste.
type CritereTri = 'numero' | 'module' | 'activite' | 'inscription'
const LIBELLES_TRI: Record<CritereTri, string> = {
  numero: 'Numéro de couple',
  module: 'Dernier module terminé',
  activite: 'Dernière activité',
  inscription: 'Date d\'inscription',
}

// Dernier module terminé : le plus avancé du parcours, puis le plus
// récemment terminé à égalité.
function valeurTri(couple: Couple, critere: CritereTri, moduleSlugs: string[]): [number, string] | null {
  if (critere === 'numero') return [couple.numero, '']
  if (critere === 'activite') return couple.derniere_connexion ? [0, couple.derniere_connexion] : null
  if (critere === 'inscription') return [0, couple.created_at]
  let rang = -1
  let le = ''
  for (const m of couple.modules) {
    const i = moduleSlugs.indexOf(m.slug)
    if (i < 0 || !m.termine_le) continue
    if (i > rang || (i === rang && m.termine_le > le)) { rang = i; le = m.termine_le }
  }
  return rang < 0 ? null : [rang, le]
}

function trierCouples(couples: Couple[], critere: CritereTri, croissant: boolean, moduleSlugs: string[]) {
  const valeurs = new Map(couples.map(c => [c.id, valeurTri(c, critere, moduleSlugs)]))
  return [...couples].sort((a, b) => {
    const va = valeurs.get(a.id) ?? null
    const vb = valeurs.get(b.id) ?? null
    if (!va || !vb) return va ? -1 : vb ? 1 : b.numero - a.numero
    const ecart = va[0] - vb[0] || va[1].localeCompare(vb[1]) || a.numero - b.numero
    return croissant ? ecart : -ecart
  })
}

const STATUS_TEXT: Record<string, string> = { locked: '🔒', en_cours: '✏️', complete: '✓', revealed: '★' }

export default function CouplesClient({
  grandesDates,
  couples,
  unassigned,
  totalModules,
  moduleSlugs,
  pacteSlug,
}: {
  grandesDates: GrandeDateAVenir[]
  couples: Couple[]
  unassigned: UnassignedMember[]
  totalModules: number
  moduleSlugs: string[]
  pacteSlug: string
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [critereTri, setCritereTri] = useState<CritereTri>('numero')
  const [croissant, setCroissant] = useState(false)

  const index = useMemo(() => couples.map(couple => ({ couple, texte: texteRecherche(couple) })), [couples])
  // Chaque mot saisi doit apparaître (ex : « lise octobre »).
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean)
  const couplesTrouves = mots.length ? index.filter(({ texte }) => mots.every(m => texte.includes(m))).map(({ couple }) => couple) : couples
  const couplesFiltres = trierCouples(couplesTrouves, critereTri, croissant, moduleSlugs)

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
      <GrandesDatesAVenir dates={grandesDates} />

      <div className="card p-5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            type="search"
            className="field pl-9 pr-9"
            placeholder="Rechercher par prénom, nom, e-mail ou date (ex : 17/10, octobre 2026)"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            aria-label="Rechercher un couple"
          />
          {recherche && (
            <button type="button" onClick={() => setRecherche('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Effacer la recherche">
              <X className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <label htmlFor="tri-couples" style={{ fontSize: 12, color: 'var(--muted)' }}>Trier par</label>
          <select id="tri-couples" className="field" style={{ width: 'auto', flex: '1 1 200px', maxWidth: 260 }} value={critereTri} onChange={e => setCritereTri(e.target.value as CritereTri)}>
            {(Object.keys(LIBELLES_TRI) as CritereTri[]).map(c => <option key={c} value={c}>{LIBELLES_TRI[c]}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setCroissant(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0"
            style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)', color: 'var(--brand)' }}
            aria-label={croissant ? 'Ordre croissant, passer en décroissant' : 'Ordre décroissant, passer en croissant'}
          >
            {croissant ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {croissant ? 'Croissant' : 'Décroissant'}
          </button>
        </div>
        {mots.length > 0 && (
          <p className="mt-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {couplesFiltres.length} résultat{couplesFiltres.length > 1 ? 's' : ''} sur {couples.length}
          </p>
        )}
      </div>

      <div>
        <button onClick={addCouple} disabled={adding} className="btn-brand text-sm py-2 px-4 flex items-center gap-2" style={{ opacity: adding ? 0.6 : 1 }}>
          <Plus className="w-4 h-4" /> {adding ? 'Création…' : 'Ajouter un couple'}
        </button>
        {addError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{addError}</p>}
      </div>

      {couples.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun couple pour l&apos;instant.</div>
      ) : couplesFiltres.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun couple ne correspond à cette recherche.</div>
      ) : (
        couplesFiltres.map(couple => (
          <CoupleCard key={couple.id} couple={couple} unassigned={unassigned} totalModules={totalModules} moduleSlugs={moduleSlugs} pacteSlug={pacteSlug} />
        ))
      )}
    </div>
  )
}

// Anniversaires de couple et de mariage et rendez-vous de bilan annuel
// des 90 prochains jours, pour préparer les e-mails.
function GrandesDatesAVenir({ dates }: { dates: GrandeDateAVenir[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarHeart className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        <h2 className="font-semibold" style={{ fontSize: 15, color: 'var(--ink)' }}>Grandes dates à venir (90 jours)</h2>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Un e-mail d&apos;alerte part aussi un mois avant chaque anniversaire. Les e-mails envoyés aux couples se valident dans <Link href="/admin#taches" style={{ color: 'var(--brand)' }}>Vue d&apos;ensemble &gt; Tâches</Link>.</p>
      {dates.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune date dans les 90 prochains jours.</p>
      ) : (
        <ul className="space-y-1.5">
          {dates.map(d => (
            <li key={`${d.numero}-${d.type}`} className="flex flex-wrap gap-x-2" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              <span className="font-mono" style={{ color: 'var(--muted)', minWidth: 110 }}>{dateLongue(d.le)}</span>
              <span><strong>Couple {d.numero}</strong>{d.nom ? ` — ${d.nom}` : ''}</span>
              <span style={{ color: 'var(--muted)' }}>
                · {LIBELLE_GRANDE_DATE[d.type]}{d.annees ? `, ${d.annees} an${d.annees > 1 ? 's' : ''}` : ''}
                {' · '}{d.joursAvant === 0 ? "aujourd'hui" : `dans ${d.joursAvant} jour${d.joursAvant > 1 ? 's' : ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CoupleCard({
  couple,
  unassigned,
  totalModules,
  moduleSlugs,
  pacteSlug,
}: {
  couple: Couple
  unassigned: UnassignedMember[]
  totalModules: number
  moduleSlugs: string[]
  pacteSlug: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [nomCouple, setNomCouple] = useState(couple.nom_couple || '')
  const [dateAnniversaire, setDateAnniversaire] = useState(couple.date_anniversaire || '')
  const [dateMariage, setDateMariage] = useState(couple.date_mariage || '')
  const [pairingCode, setPairingCode] = useState(couple.pairing_code || '')
  const [saving, setSaving] = useState(false)
  const [assignChoice, setAssignChoice] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setSaving(true)
    const code = pairingCode.trim().toUpperCase()
    const res = await adminUpdateCouple(couple.id, {
      nom_couple: nomCouple || null,
      date_anniversaire: dateAnniversaire || null,
      date_mariage: dateMariage || null,
      ...(code ? { pairing_code: code } : {}),
    })
    setSaving(false)
    if (res?.error) {
      alert(res.error)
      return
    }
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
            {' · '}
            {couple.derniere_connexion
              ? `Dernière connexion le ${new Date(couple.derniere_connexion).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : 'Aucune connexion'}
          </div>
          <button onClick={() => setEditing(e => !e)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
          <button onClick={remove} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626' }}>
            <Trash2 className="w-3.5 h-3.5" /> Effacer
          </button>
        </div>
      </div>

      {/* Grandes dates du couple */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 items-center" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
        <CalendarHeart className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
        {([
          ['Rencontre', couple.date_anniversaire, 'non renseignée'],
          ['Mariage', couple.date_mariage, 'non renseignée'],
          ['Bilan annuel', couple.rdv_annuel_le, 'pas encore fixé'],
        ] as const).map(([libelle, date, vide]) => (
          <span key={libelle}>
            <span style={{ color: 'var(--muted)' }}>{libelle} : </span>
            {date ? <strong>{dateJour(date)}</strong> : <span style={{ color: 'var(--muted)' }}>{vide}</span>}
          </span>
        ))}
      </div>

      {editing && (
        <div className="surface p-3 mb-4 flex flex-wrap gap-3 items-end">
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="flabel">Nom du couple</label>
            <input type="text" className="field" value={nomCouple} onChange={e => setNomCouple(e.target.value)} placeholder="Ex : Lise & Jérôme" />
          </div>
          <div>
            <label className="flabel">Date de rencontre</label>
            <input type="date" className="field" value={dateAnniversaire} onChange={e => setDateAnniversaire(e.target.value)} />
          </div>
          <div>
            <label className="flabel">Date de mariage</label>
            <input type="date" className="field" value={dateMariage} onChange={e => setDateMariage(e.target.value)} />
          </div>
          <div>
            <label className="flabel">Code couple</label>
            <input
              type="text"
              className="field font-mono"
              style={{ textTransform: 'uppercase', width: 100 }}
              maxLength={6}
              value={pairingCode}
              onChange={e => setPairingCode(e.target.value.toUpperCase())}
              placeholder="Ex : A1B2C3"
            />
          </div>
          <button onClick={save} disabled={saving} className="btn-brand text-xs py-2 px-3">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Membres */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {couple.members.map(member => (
          <MemberRow key={member.id} member={member} totalModules={totalModules} busy={busy} onUnassign={() => unassign(member.id)} />
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0"
              style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)', color: 'var(--brand)', opacity: (!assignChoice || busy) ? 0.5 : 1 }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Assigner
            </button>
          </div>
        ))}
      </div>

      {/* Grille modules */}
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${moduleSlugs.length}, minmax(0, 1fr))` }}>
        {moduleSlugs.map((slug, i) => {
          const mod = couple.modules.find(m => m.slug === slug)
          const st = mod?.statut || 'locked'
          const bg = mod?.revealed ? STATUS_COLOR.revealed : STATUS_COLOR[st] || STATUS_COLOR.locked
          return (
            <div key={slug} className="rounded-lg p-2 text-center" style={{ background: bg, border: '1px solid rgba(0,0,0,.06)' }}>
              <div className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{slug === pacteSlug ? 'Pacte' : `M${i + 1}`}</div>
              <div style={{ fontSize: 16 }}>{STATUS_TEXT[mod?.revealed ? 'revealed' : st]}</div>
              {mod?.termine_le && (
                <div className="font-mono" style={{ fontSize: 9, color: 'white', marginTop: 2 }} title="Date de fin du module">
                  {dateCourte(mod.termine_le)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rendez-vous annuels : une case par rendez-vous validé */}
      <div className="font-mono font-bold mb-1" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em' }}>RENDEZ-VOUS ANNUELS</div>
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${RDV_ANNUELS_AFFICHES}, minmax(0, 1fr))` }}>
        {Array.from({ length: RDV_ANNUELS_AFFICHES }).map((_, i) => {
          const valide = i < couple.rdvAnnuels.valides.length
          const date = valide ? couple.rdvAnnuels.valides[i] : null
          const suivant = i === couple.rdvAnnuels.valides.length
          const enCours = suivant && couple.rdvAnnuels.enCours
          const prevu = suivant && !enCours ? couple.rdvAnnuels.prevuLe : null
          return (
            <div
              key={i}
              className="rounded-lg p-2 text-center"
              title={valide ? 'Rendez-vous annuel validé' : enCours ? 'Rendez-vous annuel ouvert, pas encore terminé' : prevu ? 'Date prévue du rendez-vous annuel' : ''}
              style={{ background: valide ? STATUS_COLOR.revealed : enCours ? STATUS_COLOR.en_cours : 'transparent', border: valide || enCours ? '1px solid rgba(0,0,0,.06)' : '1px dashed var(--line)', minHeight: 44 }}
            >
              <div className="font-mono font-bold" style={{ fontSize: 10, color: valide ? 'white' : 'var(--muted)', marginBottom: 2 }}>RDV {i + 1}</div>
              {valide && <div style={{ fontSize: 14, color: 'white' }}>★</div>}
              {valide && date && <div className="font-mono" style={{ fontSize: 9, color: 'white' }}>{dateCourte(date)}</div>}
              {enCours && <div style={{ fontSize: 14 }}>✏️</div>}
              {prevu && <div className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>prévu {dateCourte(`${prevu.slice(0, 10)}T12:00:00Z`)}</div>}
            </div>
          )
        })}
      </div>

      <EmailsCouple emails={couple.emails} />

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

function MemberRow({
  member,
  totalModules,
  busy,
  onUnassign,
}: {
  member: MemberProgress
  totalModules: number
  busy: boolean
  onUnassign: () => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [prenom, setPrenom] = useState(member.prenom || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await adminUpdateProfile(member.id, { prenom: prenom || null })
    setSaving(false)
    if (res?.error) {
      alert(res.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {[member.prenom, member.nom].filter(Boolean).join(' ') || '—'} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>({member.role || 'membre'})</span>
          </div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{member.email}</div>
          <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4 }}>{member.modulesCompleted}/{totalModules} modules terminés</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Dernière connexion : {member.derniereConnexion ? new Date(member.derniereConnexion).toLocaleDateString('fr-FR') : 'jamais'}
          </div>
          {!member.rappelsEmail && (
            <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
              <BellOff className="w-3 h-3" /> A demandé à ne plus recevoir les e-mails de rappel
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(e => !e)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onUnassign} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626' }}>
            <UserMinus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap gap-2 items-end mt-3">
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="flabel">Prénom</label>
            <input type="text" className="field" value={prenom} onChange={e => setPrenom(e.target.value)} />
          </div>
          <button onClick={save} disabled={saving} className="btn-brand text-xs py-2 px-3">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}

function EmailsCouple({ emails }: { emails: EmailEnvoye[] }) {
  const [tout, setTout] = useState(false)
  const visibles = tout ? emails : emails.slice(0, 3)

  return (
    <div className="surface p-3 mb-3">
      <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 12, fontWeight: 600 }}>
        <Mail className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
        E-mails envoyés <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({emails.length})</span>
      </div>
      {emails.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>Aucun e-mail envoyé pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-1">
          {visibles.map((e, i) => (
            <li key={i} className="flex gap-3 flex-wrap" style={{ fontSize: 11 }}>
              <span className="font-mono" style={{ color: 'var(--muted)', minWidth: 120 }}>
                {new Date(e.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ color: 'var(--ink-2)', minWidth: 80 }}>{e.destinataire}</span>
              <span style={{ flex: 1, color: e.ok ? 'var(--ink)' : '#dc2626' }}>
                {e.sujet}{!e.ok && ' — échec de l\'envoi'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {emails.length > 3 && (
        <button onClick={() => setTout(t => !t)} className="mt-2 text-xs font-medium" style={{ color: 'var(--brand)' }}>
          {tout ? 'Afficher moins' : `Voir tout (${emails.length})`}
        </button>
      )}
    </div>
  )
}
