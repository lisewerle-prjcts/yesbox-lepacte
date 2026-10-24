import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { dernieresConnexions, modulesTerminesParCouple } from '@/lib/segments-donnees'
import { prochainesGrandesDates } from '@/lib/grandes-dates'
import CouplesClient, { type EmailEnvoye } from './CouplesClient'

const LIBELLES_NOTIFICATION: Record<string, string> = {
  reponses_a_ton_tour: 'à ton tour de répondre',
  reponses_partagees: 'réponses partagées',
  journal_a_ton_tour: 'à ton tour de conclure',
  journal_complet: 'conclusions complètes',
}
const LIBELLES_RAPPEL: Record<string, string> = {
  mensuel: 'Rappel mensuel des engagements',
  bascule_annuelle: 'Proposition de l\'abonnement annuel',
  effacement_donnees: 'Avertissement avant effacement des données',
  invitation: 'Invitation du ou de la partenaire',
}

export default async function AdminCouples() {
  const supabase = createAdminClient()

  const [{ data: couples, error: couplesError }, { data: profiles }, effectiveModules, connexions, terminesParCouple, { data: journalEmails }, { data: rappels }] = await Promise.all([
    supabase.from('couples').select('id, numero, pairing_code, nom_couple, date_anniversaire, date_mariage, created_at, derniere_relance_le').order('numero', { ascending: false }),
    supabase.from('profiles').select('id, prenom, nom, email, couple_id, role, rappels_email, email_bienvenue_envoye_le').order('email'),
    getEffectiveModules(),
    dernieresConnexions(supabase),
    modulesTerminesParCouple(supabase),
    // Table absente (SQL pas encore exécuté) : data null, la page reste utilisable.
    supabase.from('emails_envoyes').select('destinataire, sujet, ok, envoye_le').order('envoye_le', { ascending: false }).limit(10000),
    supabase.from('rappels_envoyes').select('couple_id, type, envoye_le'),
  ])

  const questionCountBySlug: Record<string, number> = {}
  for (const m of effectiveModules) questionCountBySlug[m.slug] = m.questions.length
  const SLUGS = effectiveModules.map(m => m.slug)

  const coupleIds = (couples || []).map(c => c.id)

  const { data: modules } = coupleIds.length
    ? await supabase.from('modules').select('id, couple_id, slug, statut, revealed, revealed_at').in('couple_id', coupleIds)
    : { data: [] }
  const { data: notifications } = await supabase.from('notifications_module').select('module_id, destinataire_id, type, envoye_le')

  // Historique des e-mails : le journal (emails_envoyes) quand il existe ;
  // avant sa mise en place, ce que les autres tables gardent en mémoire
  // (bienvenue, notifications entre partenaires, rappels, dernière relance).
  const journal = journalEmails ?? []
  const debutJournal = journal.length ? journal[journal.length - 1].envoye_le : null
  const avantJournal = (date: string | null | undefined): date is string => !!date && (!debutJournal || date < debutJournal)
  const journalParAdresse = new Map<string, typeof journal>()
  for (const e of journal) {
    const cle = e.destinataire.toLowerCase()
    journalParAdresse.set(cle, [...(journalParAdresse.get(cle) ?? []), e])
  }
  const numeroModule = (slug: string) => SLUGS.indexOf(slug) + 1
  const moduleParId = new Map((modules || []).map(m => [m.id, m]))

  const moduleIds = (modules || []).map(m => m.id)
  const { data: reponses } = moduleIds.length
    ? await supabase.from('reponses').select('module_id, user_id').in('module_id', moduleIds)
    : { data: [] }

  const allProfiles = profiles || []
  const unassigned = allProfiles.filter(p => !p.couple_id).map(p => ({ id: p.id, prenom: p.prenom, nom: p.nom, email: p.email, role: p.role }))

  const couplesData = (couples || []).map(couple => {
    const members = allProfiles.filter(p => p.couple_id === couple.id)
    const prenomDe = (id: string) => members.find(m => m.id === id)?.prenom || members.find(m => m.id === id)?.email || '—'
    const LES_DEUX = members.length > 1 ? 'Les deux' : prenomDe(members[0]?.id ?? '')

    const emails: EmailEnvoye[] = []
    for (const m of members) {
      for (const e of journalParAdresse.get(m.email.toLowerCase()) ?? []) {
        emails.push({ date: e.envoye_le, destinataire: m.prenom || m.email, sujet: e.sujet, ok: e.ok })
      }
      if (avantJournal(m.email_bienvenue_envoye_le)) emails.push({ date: m.email_bienvenue_envoye_le, destinataire: m.prenom || m.email, sujet: 'E-mail de bienvenue', ok: true })
    }
    for (const n of notifications || []) {
      const mod = moduleParId.get(n.module_id)
      if (!mod || mod.couple_id !== couple.id || !avantJournal(n.envoye_le)) continue
      emails.push({ date: n.envoye_le, destinataire: prenomDe(n.destinataire_id), sujet: `M${numeroModule(mod.slug)} : ${LIBELLES_NOTIFICATION[n.type] ?? n.type}`, ok: true })
    }
    for (const r of rappels || []) {
      // Les alertes de grandes dates partent vers l'équipe, pas vers le couple.
      if (r.couple_id !== couple.id || r.type === 'alerte_grande_date' || !avantJournal(r.envoye_le)) continue
      emails.push({ date: r.envoye_le, destinataire: LES_DEUX, sujet: LIBELLES_RAPPEL[r.type] ?? r.type, ok: true })
    }
    if (avantJournal(couple.derniere_relance_le)) emails.push({ date: couple.derniere_relance_le, destinataire: LES_DEUX, sujet: 'Relance après inactivité', ok: true })
    emails.sort((a, b) => b.date.localeCompare(a.date))
    const coupleModules = (modules || []).filter(m => m.couple_id === couple.id)

    const membersWithProgress = members.map(member => {
      let modulesCompleted = 0
      for (const slug of SLUGS) {
        const mod = coupleModules.find(m => m.slug === slug)
        if (!mod) continue
        const total = questionCountBySlug[slug] || 0
        const answered = (reponses || []).filter(r => r.module_id === mod.id && r.user_id === member.id).length
        if (total > 0 && answered >= total) modulesCompleted += 1
      }
      return { id: member.id, prenom: member.prenom, nom: member.nom, email: member.email, role: member.role, modulesCompleted, derniereConnexion: connexions[member.id] ?? null, rappelsEmail: member.rappels_email !== false }
    })
    // Dernière connexion du couple : la plus récente de ses membres.
    const derniereConnexion = membersWithProgress
      .map(m => m.derniereConnexion)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null

    return {
      id: couple.id,
      numero: couple.numero,
      pairing_code: couple.pairing_code,
      nom_couple: couple.nom_couple,
      date_anniversaire: couple.date_anniversaire,
      date_mariage: couple.date_mariage,
      created_at: couple.created_at,
      derniere_connexion: derniereConnexion,
      emails,
      members: membersWithProgress,
      modules: coupleModules.map(m => ({ slug: m.slug, statut: m.statut, revealed: m.revealed, termine_le: terminesParCouple.get(couple.id)?.[m.slug] ?? null })),
    }
  })

  // Anniversaires de rencontre et de mariage des 90 prochains jours, pour
  // préparer les e-mails (une alerte part aussi par e-mail un mois avant).
  const grandesDates = couplesData
    .flatMap(c => prochainesGrandesDates(c).map(d => ({ ...d, numero: c.numero, nom: c.nom_couple || c.members.map(m => m.prenom || m.email).join(' & ') })))
    .filter(d => d.joursAvant <= 90)
    .sort((a, b) => a.joursAvant - b.joursAvant)
    .map(d => ({ type: d.type, le: d.le.toISOString(), annees: d.annees, joursAvant: d.joursAvant, numero: d.numero, nom: d.nom }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>Couples & progression</h1>
        <span className="tag-muted">{couplesData.length} couple{couplesData.length > 1 ? 's' : ''}</span>
      </div>
      {couplesError && (
        <div className="card p-4 mb-4" style={{ borderColor: '#dc2626', fontSize: 13, color: '#dc2626' }}>
          Erreur lors du chargement des couples : {couplesError.message}
        </div>
      )}
      <CouplesClient grandesDates={grandesDates} couples={couplesData} unassigned={unassigned} totalModules={SLUGS.length} moduleSlugs={SLUGS} />
    </div>
  )
}
