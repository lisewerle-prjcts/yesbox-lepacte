import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { modulesTerminesParCouple, programmeInitialTermine } from '@/lib/segments-donnees'
import Link from 'next/link'
import { MODULE_RDV_ANNUEL } from '@/lib/progression'
import { tachesEmailsAnniversaire, grandesDatesAVenir } from '@/lib/grandes-dates'
import GrandesDatesAVenir, { type GrandeDateAVenir } from '@/components/admin/GrandesDatesAVenir'
import TachesClient from './TachesClient'
import ProblemesConnexionClient from './ProblemesConnexionClient'
import { chargerProblemesConnexion } from '@/lib/problemes-connexion'
import { formaterMoisAvis } from '@/lib/avis'
import type { AvisAdmin } from './AvisTaches'
import type { RelanceAVenir } from './TachesClient'
import { demandesAvisPrevues, parrainagesPrevus, relancesDemarragePrevues, relancesInactivitePrevues } from '@/lib/rappels-email'
import { modeleEmail } from '@/lib/modeles-email/catalogue'

// Les rappels partent avec la tâche quotidienne de 7 h (UTC, cf. vercel.json) :
// premier passage à partir de la date où la relance est due.
const HEURE_TACHE_UTC = 7
function prochainPassage(dueLe: string, maintenant: number): string {
  const depart = Math.max(new Date(dueLe).getTime(), maintenant)
  const d = new Date(depart)
  let passage = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), HEURE_TACHE_UTC)
  if (passage < depart) passage += 24 * 60 * 60 * 1000
  return new Date(passage).toISOString()
}
const RELANCES_HORIZON_JOURS = 3

// Un couple « en pause » n'a enregistré ni réponse ni conclusion depuis plus
// de 5 jours.
const PAUSE_APRES_JOURS = 5

// Lit toutes les lignes d'une requête, par pages de 1000 (limite Supabase).
async function toutesLesLignes<T>(lire: (debut: number, fin: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const lignes: T[] = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await lire(debut, debut + 999)
    if (error) throw new Error(error.message)
    lignes.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return lignes
}

export default async function AdminHome() {
  const supabase = createAdminClient()

  const [
    { count: totalUsers },
    { data: allCouples },
    terminesParCouple,
    { data: modulesStats },
    effectiveModules,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('couples').select('id, numero, nom_couple, date_anniversaire, date_mariage, rdv_annuel_le, created_at, pacte_signe_le, derniere_activite_le, compte_resilie_le'),
    modulesTerminesParCouple(supabase),
    supabase.from('modules').select('slug,statut,revealed').order('slug'),
    getEffectiveModules(),
  ])
  const { taches, tableManquante } = await tachesEmailsAnniversaire(supabase)
  const problemes = await chargerProblemesConnexion(supabase)
  const { data: avisRows, error: erreurAvis } = await supabase.from('avis')
    .select('id, prenom, debut_mois, note, texte, statut, cree_le, code_reduction, code_utilise_le, profiles(email)')
    .in('statut', ['en_attente', 'publie'])
    .order('cree_le', { ascending: false })
  const avis: AvisAdmin[] = (avisRows ?? []).map(a => {
    const auteur = (Array.isArray(a.profiles) ? a.profiles[0] : a.profiles) as { email: string | null } | null
    return {
      id: a.id, prenom: a.prenom, email: auteur?.email ?? null, debut: formaterMoisAvis(a.debut_mois, 'fr'), note: a.note, texte: a.texte,
      statut: a.statut, creeLe: a.cree_le, code: a.code_reduction, codeUtiliseLe: a.code_utilise_le,
    }
  })

  // Parcours rendez-vous annuel : programme initial fini (les 8 modules
  // thématiques et le pacte terminés, pacte signé), comme le critère
  // « Programme initial fini » des segments.
  const totalCouples = allCouples?.length ?? 0
  const slugs = effectiveModules.map(m => m.slug)
  const couplesParcoursBac = (allCouples ?? []).filter(c => programmeInitialTermine(slugs, terminesParCouple.get(c.id) ?? {}, c.pacte_signe_le)).length
  const couplesParcoursInitial = totalCouples - couplesParcoursBac

  // Relances qui partiront dans les 3 prochains jours (inactivité et
  // démarrage), d'après l'état actuel des couples : une réponse enregistrée
  // d'ici là annule la relance.
  const maintenantTaches = Date.now()
  const horizon = maintenantTaches + RELANCES_HORIZON_JOURS * 24 * 60 * 60 * 1000
  const numeroCouple = new Map((allCouples ?? []).map(c => [c.id, c.numero as number | null]))
  const [inactivite, demarrage, avisPrevus, parrainages] = await Promise.all([
    relancesInactivitePrevues(supabase, horizon).catch(() => []),
    relancesDemarragePrevues(supabase, horizon).catch(() => []),
    demandesAvisPrevues(supabase, horizon).catch(() => []),
    parrainagesPrevus(supabase, horizon).catch(() => []),
  ])
  // N° du dernier module terminé de chaque couple (parcours initial), ou
  // « Pacte signé ».
  const parcours = effectiveModules.filter(m => m.slug !== MODULE_RDV_ANNUEL)
  const dernierModule = (coupleId: string) => {
    const couple = (allCouples ?? []).find(c => c.id === coupleId)
    if (couple?.pacte_signe_le) return 'Pacte signé'
    const termines = terminesParCouple.get(coupleId) ?? {}
    const index = parcours.map(m => m.slug in termines).lastIndexOf(true)
    return index < 0 ? 'Aucun' : `M${index + 1} · ${parcours[index].titre}`
  }
  const destinatairesDe = (liste: { prenom: string | null; email: string | null }[]) => liste.map(d => d.prenom ? `${d.prenom} (${d.email})` : d.email as string)
  const relancesAVenir: RelanceAVenir[] = [
    ...inactivite.map(r => ({
      sorte: 'inactivite' as const,
      dernierModule: dernierModule(r.coupleId),
      cle: null,
      coupleId: r.coupleId,
      couple: `Couple ${numeroCouple.get(r.coupleId) ?? '?'}`,
      email: modeleEmail(r.modele).nom,
      detail: `Relance d’inactivité n°${r.rang + 1} (${r.rang === 0 ? '10' : '20'} jours sans avancer)`,
      destinataires: r.destinataires.map(d => d.prenom ? `${d.prenom} (${d.email})` : d.email as string),
      le: prochainPassage(r.dueLe, maintenantTaches),
    })),
    ...demarrage.map(r => ({
      sorte: 'demarrage' as const,
      dernierModule: dernierModule(r.coupleId),
      cle: null,
      coupleId: r.coupleId,
      couple: `Couple ${numeroCouple.get(r.coupleId) ?? '?'}`,
      email: modeleEmail(r.modele).nom,
      detail: `${r.type === 'non_paire' ? 'Pas encore au complet' : 'Au complet, jamais commencé'} (palier ${r.jours} jours)`,
      destinataires: r.membres.filter(m => m.rappels_email && m.email).map(m => m.prenom ? `${m.prenom} (${m.email})` : m.email as string),
      le: prochainPassage(r.dueLe, maintenantTaches),
    })),
    ...[...avisPrevus, ...parrainages].map(r => ({
      sorte: r.modele === 'parrainage_module_5' ? 'parrainage' as const : 'avis' as const,
      dernierModule: dernierModule(r.coupleId),
      cle: r.cle,
      coupleId: r.coupleId,
      couple: `Couple ${numeroCouple.get(r.coupleId) ?? '?'}`,
      email: modeleEmail(r.modele).nom,
      detail: r.modele === 'parrainage_module_5' ? 'Module 5 terminé' : r.cle === 'pacte' ? 'Pacte signé il y a 2 jours' : 'Premier module terminé il y a 2 jours',
      destinataires: destinatairesDe(r.destinataires),
      le: prochainPassage(r.dueLe, maintenantTaches),
    })),
  ].filter(r => r.destinataires.length && new Date(r.le).getTime() <= horizon)
    .sort((a, b) => a.le.localeCompare(b.le))

  // Chiffres clés (comptes résiliés exclus). Un couple a « commencé » dès
  // sa première réponse ou conclusion : derniere_activite_le est alors posée
  // après la création du couple (elle reste vide, ou égale à la date de
  // création, tant que rien n'est enregistré).
  const membresParCouple = new Map<string, number>()
  const prenomsParCouple = new Map<string, string[]>()
  for (const p of await toutesLesLignes<{ couple_id: string | null; prenom: string | null; email: string | null }>((debut, fin) => supabase.from('profiles').select('couple_id, prenom, email').not('couple_id', 'is', null).range(debut, fin))) {
    membresParCouple.set(p.couple_id!, (membresParCouple.get(p.couple_id!) ?? 0) + 1)
    prenomsParCouple.set(p.couple_id!, [...(prenomsParCouple.get(p.couple_id!) ?? []), p.prenom || p.email || ''])
  }

  // Grandes dates des 90 prochains jours (comme dans Couples & progression).
  const grandesDates: GrandeDateAVenir[] = grandesDatesAVenir((allCouples ?? []).map(c => ({
    numero: c.numero as number,
    nom: (c.nom_couple as string | null) || (prenomsParCouple.get(c.id) ?? []).join(' & '),
    date_anniversaire: c.date_anniversaire as string | null,
    date_mariage: c.date_mariage as string | null,
    rdv_annuel_le: c.rdv_annuel_le as string | null,
  })))
  const limitePause = Date.now() - PAUSE_APRES_JOURS * 24 * 60 * 60 * 1000
  const chiffres = { solo: 0, pasCommence: 0, actifs: 0, enPause: 0, pactesSignes: 0 }
  for (const c of allCouples ?? []) {
    if (c.compte_resilie_le) continue
    const membres = membresParCouple.get(c.id) ?? 0
    if (membres === 1) { chiffres.solo++; continue }
    if (membres !== 2) continue
    if (c.pacte_signe_le) { chiffres.pactesSignes++; continue }
    const activite = c.derniere_activite_le ? new Date(c.derniere_activite_le).getTime() : null
    const commence = activite !== null && activite > new Date(c.created_at).getTime()
    if (!commence) chiffres.pasCommence++
    else if (activite! >= limitePause) chiffres.actifs++
    else chiffres.enPause++
  }

  // Satisfaction : notes de tous les avis reçus (publiés, en attente ou
  // refusés : le refus porte sur la publication du texte, pas sur la note).
  const notes = (await toutesLesLignes<{ note: number }>((debut, fin) => supabase.from('avis').select('note').range(debut, fin)).catch(() => [])).map(a => a.note)
  const moyenne = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null
  const satisfaits = notes.filter(n => n >= 4).length
  const tauxSatisfaction = notes.length ? Math.round(satisfaits / notes.length * 100) : null

  const CHIFFRES_CLES: { label: string; detail: string; value: string | number; color: string; href?: string }[] = [
    { label: 'Utilisateurs', detail: 'Comptes inscrits', value: totalUsers ?? 0, color: 'var(--ink)', href: '/admin/utilisateurs' },
    { label: 'Couples — parcours initial', detail: 'Programme initial pas encore fini', value: couplesParcoursInitial, color: 'var(--brand)', href: '/admin/couples' },
    { label: 'Couples — parcours rendez-vous annuel', detail: 'Modules terminés et pacte signé', value: couplesParcoursBac, color: 'var(--sage)', href: '/admin/couples' },
    { label: 'Couples actifs', detail: `Réponse ou conclusion dans les ${PAUSE_APRES_JOURS} derniers jours, pacte pas encore signé`, value: chiffres.actifs, color: 'var(--sage)', href: '/admin/couples' },
    { label: `En pause depuis plus de ${PAUSE_APRES_JOURS} jours`, detail: 'Parcours commencé, plus rien depuis', value: chiffres.enPause, color: 'var(--brand)', href: '/admin/couples' },
    { label: 'Couples pas encore commencés', detail: 'Au complet, aucune réponse enregistrée', value: chiffres.pasCommence, color: 'var(--brand)', href: '/admin/couples' },
    { label: 'Inscrit·es en solo', detail: 'Personne n’a encore rejoint leur couple', value: chiffres.solo, color: 'var(--ink)', href: '/admin/utilisateurs' },
    { label: 'Pactes signés', detail: 'Couples entrés dans le parcours rendez-vous annuel', value: chiffres.pactesSignes, color: 'var(--sage)', href: '/admin/couples' },
    {
      label: 'Taux de satisfaction',
      detail: notes.length ? `${satisfaits} avis sur ${notes.length} à 4 ou 5 étoiles · moyenne ${moyenne!.toFixed(1).replace('.', ',')}/5` : 'Aucun avis reçu pour l’instant',
      value: tauxSatisfaction === null ? '—' : `${tauxSatisfaction} %`,
      color: 'var(--ink)',
    },
  ]

  const moduleSlugs = effectiveModules.map(m => m.slug)
  const moduleNames: Record<string, string> = Object.fromEntries(effectiveModules.map(m => [m.slug, m.titre]))

  const statsBySlug = moduleSlugs.map(slug => {
    const rows = (modulesStats || []).filter(m => m.slug === slug)
    return {
      slug,
      name: moduleNames[slug],
      complete: rows.filter(m => m.statut === 'complete' || m.statut === 'revealed').length,
      revealed: rows.filter(m => m.revealed).length,
      total: rows.length,
    }
  })


  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Vue d&apos;ensemble</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Tableau de bord administrateur YES BOX</p>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CHIFFRES_CLES.map(s => {
          const contenu = (
            <>
              <div className="font-serif font-bold mb-1" style={{ fontSize: 36, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{s.detail}</div>
            </>
          )
          return s.href
            ? <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-shadow">{contenu}</Link>
            : <div key={s.label} className="card p-5">{contenu}</div>
        })}
      </div>

      <TachesClient taches={taches} tableManquante={tableManquante} avis={avis} avisTableManquante={!!erreurAvis} relances={relancesAVenir} />
      <div className="mb-8"><GrandesDatesAVenir dates={grandesDates} /></div>
      <ProblemesConnexionClient {...problemes} />

      {/* Stats modules */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4" style={{ fontSize: 15 }}>Avancement par module</h2>
        <div className="space-y-3">
          {statsBySlug.map(m => (
            <div key={m.slug}>
              <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--ink-2)' }}>{m.name}</span>
                <span style={{ color: 'var(--muted)' }}>{m.complete} terminés · {m.revealed} révélés / {m.total}</span>
              </div>
              <div className="progress-bar">
                <span className="progress-bar-fill" style={{ width: m.total ? `${Math.round(m.complete / m.total * 100)}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
