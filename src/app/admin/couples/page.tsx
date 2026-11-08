import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { dernieresConnexions, modulesTerminesParCouple } from '@/lib/segments-donnees'
import { grandesDatesAVenir } from '@/lib/grandes-dates'
import { MODULE_PACTE, MODULE_RDV_ANNUEL } from '@/lib/progression'
import { CLES_THEMES_MENSUELS, cleAnniversaireRencontre, estModeleEmail, modeleEmail, themeMensuelParDefaut } from '@/lib/modeles-email/catalogue'
import CouplesClient, { type EmailEnvoye, type EmailRecu, type GrandeDateAVenir } from './CouplesClient'

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

type RappelEnvoye = { couple_id: string; type: string; cle: string; envoye_le: string }

// E-mails reçus après la signature du pacte, d'après rappels_envoyes :
// thèmes du mois (« Mensuel 3 »), anniversaires de couple (« Anniversaire 7 »,
// numéro du modèle), de mariage, fêtes de fin d'année, Saint-Valentin, annonce du rendez-vous
// annuel.
function emailsRecus(rappels: RappelEnvoye[], dateRencontre: string | null, dateMariage: string | null): EmailRecu[] {
  const recus: EmailRecu[] = []
  const moisEnvoyes = new Map(rappels.filter(r => r.type === 'mensuel').map(r => [r.cle, r.envoye_le]))
  const themes = new Map<string, string>()
  for (const r of rappels.filter(r => r.type === 'theme_mensuel')) {
    const [mois, cle] = r.cle.split(':')
    if (mois && cle) themes.set(mois, cle)
  }
  for (const [mois, date] of moisEnvoyes) {
    const cle = themes.get(mois)
    if (!cle) {
      recus.push({ famille: 'rdv', libelle: 'Annonce RDV annuel', detail: `Mois ${mois} : le rendez-vous annuel approche`, date })
      continue
    }
    const rang = CLES_THEMES_MENSUELS.indexOf(cle)
    const titre = themeMensuelParDefaut(cle)?.objet.fr ?? cle
    recus.push({
      famille: 'mensuel',
      libelle: rang >= 0 ? `Mensuel ${rang + 1}` : `Mensuel ${cle.replace('mensuel_', '')} (ancien)`,
      detail: `Mois ${mois} : ${titre}`,
      date,
    })
  }
  for (const r of rappels.filter(r => r.type === 'alerte_grande_date' && r.cle.startsWith('email_'))) {
    const [type, anniversaire] = r.cle.slice('email_'.length).split(':')
    const origine = type === 'mariage' ? dateMariage : dateRencontre
    const annees = origine && anniversaire ? Number(anniversaire.slice(0, 4)) - Number(origine.slice(0, 4)) : null
    if (type === 'rencontre') {
      const cle = annees ? cleAnniversaireRencontre(annees) : null
      recus.push({
        famille: 'anniversaire',
        libelle: cle ? `Anniversaire ${cle.replace('anniv_rencontre_', '')}` : 'Anniversaire',
        detail: `Anniversaire de couple${annees ? ` (${annees} an${annees > 1 ? 's' : ''})` : ''}${cle ? ` : ${modeleEmail(cle).etiquette ?? ''}` : ''}`,
        date: r.envoye_le,
      })
    } else if (type === 'mariage') {
      recus.push({ famille: 'anniversaire', libelle: `Mariage${annees ? ` ${annees} an${annees > 1 ? 's' : ''}` : ''}`, detail: 'Anniversaire de mariage (une semaine avant)', date: r.envoye_le })
    }
  }
  for (const r of rappels.filter(r => r.type === 'fete')) {
    const [fete, annee] = r.cle.split(':')
    const nom = fete === 'noel' ? 'Fêtes' : fete === 'saint_valentin' ? 'Saint-Valentin' : fete
    recus.push({ famille: 'fete', libelle: `${nom} ${annee ?? ''}`.trim(), detail: estModeleEmail(fete) ? modeleEmail(fete).nom : nom, date: r.envoye_le })
  }
  return recus.sort((a, b) => a.date.localeCompare(b.date))
}

export default async function AdminCouples() {
  const supabase = createAdminClient()

  const [{ data: couples, error: couplesError }, { data: profiles }, effectiveModules, connexions, terminesParCouple, { data: journalEmails }, { data: rappels }, { data: signatures }] = await Promise.all([
    supabase.from('couples').select('id, numero, pairing_code, nom_couple, date_anniversaire, date_mariage, created_at, derniere_relance_le').order('numero', { ascending: false }),
    supabase.from('profiles').select('id, prenom, nom, email, couple_id, role, rappels_email, email_bienvenue_envoye_le').order('email'),
    getEffectiveModules(),
    dernieresConnexions(supabase),
    modulesTerminesParCouple(supabase),
    // Table absente (SQL pas encore exécuté) : data null, la page reste utilisable.
    supabase.from('emails_envoyes').select('destinataire, sujet, ok, envoye_le').order('envoye_le', { ascending: false }).limit(10000),
    supabase.from('rappels_envoyes').select('couple_id, type, cle, envoye_le'),
    // Requête à part : si la colonne manque en base, le reste s'affiche.
    supabase.from('couples').select('id, rdv_annuel_le'),
  ])
  const rdvAnnuelParCouple = new Map((signatures ?? []).map(s => [s.id, s.rdv_annuel_le as string | null]))

  const questionCountBySlug: Record<string, number> = {}
  for (const m of effectiveModules) questionCountBySlug[m.slug] = m.questions.length
  const SLUGS = effectiveModules.map(m => m.slug)
  // Parcours initial : les 8 modules thématiques et le pacte ; le module du
  // rendez-vous annuel est affiché à part (une case par rendez-vous).
  const SLUGS_INITIAUX = SLUGS.filter(s => s !== MODULE_RDV_ANNUEL)

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

  const modulesAvecReponses = new Set((reponses || []).map(r => r.module_id))
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
    const termines = terminesParCouple.get(couple.id) ?? {}
    const rdvValide = MODULE_RDV_ANNUEL in termines

    const membersWithProgress = members.map(member => {
      let modulesCompleted = 0
      for (const slug of SLUGS_INITIAUX) {
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
      rdv_annuel_le: rdvAnnuelParCouple.get(couple.id) ?? null,
      created_at: couple.created_at,
      derniere_connexion: derniereConnexion,
      // A commencé : au moins une réponse enregistrée, par l'un ou l'autre.
      a_commence: coupleModules.some(m => modulesAvecReponses.has(m.id)),
      emails,
      emailsRecus: emailsRecus(((rappels || []) as RappelEnvoye[]).filter(r => r.couple_id === couple.id), couple.date_anniversaire, couple.date_mariage),
      members: membersWithProgress,
      modules: coupleModules.map(m => ({ slug: m.slug, statut: m.statut, revealed: m.revealed, termine_le: terminesParCouple.get(couple.id)?.[m.slug] ?? null })),
      // Rendez-vous annuels validés (module du rendez-vous annuel terminé :
      // révélé et conclu par les deux) ; un seul est suivi pour l'instant.
      rdvAnnuels: {
        valides: rdvValide ? [termines[MODULE_RDV_ANNUEL] ?? null] : [],
        enCours: !rdvValide && coupleModules.some(m => m.slug === MODULE_RDV_ANNUEL && m.statut !== 'locked'),
        prevuLe: rdvAnnuelParCouple.get(couple.id) ?? null,
      },
    }
  })

  // Anniversaires de couple et de mariage et rendez-vous de bilan annuel
  // des 90 prochains jours, pour préparer les e-mails (une alerte part aussi
  // par e-mail un mois avant les anniversaires).
  const nomDu = (c: (typeof couplesData)[number]) => c.nom_couple || c.members.map(m => m.prenom || m.email).join(' & ')
  const grandesDates: GrandeDateAVenir[] = grandesDatesAVenir(couplesData.map(c => ({ ...c, nom: nomDu(c) })))

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
      <CouplesClient grandesDates={grandesDates} couples={couplesData} unassigned={unassigned} totalModules={SLUGS_INITIAUX.length} moduleSlugs={SLUGS_INITIAUX} pacteSlug={MODULE_PACTE} />
    </div>
  )
}
