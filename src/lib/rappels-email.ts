import type { createAdminClient } from '@/lib/supabase/server'
import { mailConfigure } from '@/lib/mailer'
import { getEffectiveModules } from '@/lib/modules-effective'
import { hasAnsweredAll } from '@/lib/questions'
import { aAccesComplet, offreRdvAnnuel, peutAccederModule } from '@/lib/abonnement'
import { MODULE_RDV_ANNUEL, MODULE_PACTE, entreesDeFin } from '@/lib/progression'
import { ABONNEMENT_COLONNES } from '@/types'
import type { CoupleAbonnement } from '@/types'
import { t, type Locale } from '@/lib/i18n/locale'
import { languesDesProfils } from '@/lib/i18n/langue-profil'
import { dechiffrerLignes } from '@/lib/chiffrement'
import { envoyerModele } from '@/lib/modeles-email/serveur'
import { CLES_THEMES_MENSUELS, themeMensuelParDefaut, type ContenuEmail } from '@/lib/modeles-email/catalogue'
import type { Variables } from '@/lib/modeles-email/rendu'

// Le lien de désinscription est signé dans src/lib/desinscription.ts.
export { signatureDesinscription, verifierSignatureDesinscription } from '@/lib/desinscription'

type AdminClient = ReturnType<typeof createAdminClient>

// E-mails de rappel envoyés par la tâche planifiée quotidienne
// /api/cron/rappels-email :
//   1. relance quand un couple n'a pas avancé dans son parcours depuis
//      10 jours (puis une seconde à 20 jours, pas plus) ;
//   1 bis. relance des inscrit·es qui ne concrétisent pas : couple pas encore
//      au complet (personne n'a rejoint), ou couple au complet qui n'a
//      jamais répondu à une seule question — 3 jours puis 10 jours après,
//      pas plus ;
//   2. une fois le pacte signé, un e-mail par mois pour faire vivre les
//      engagements (chaque thème une seule fois, sans boucle ; rien les mois
//      des fêtes de fin d'année, de la Saint-Valentin, du rendez-vous annuel et des
//      anniversaires), l'annonce du rendez-vous annuel un mois avant, et les
//      e-mails des fêtes de fin d'année et de la Saint-Valentin ;
//   3. une fois le pacte signé, 5 jours avant la fin du mois payé, la
//      proposition de passer de l'abonnement mensuel à l'abonnement annuel
//      (« Pacte – notre rendez-vous annuel », bascule Stripe programmée
//      depuis la page Notre Pacte) ;
//   4. avant l'effacement des données (après 24 mois d'inactivité, cf.
//      src/lib/conservation.ts), un avertissement 2 mois, 1 mois,
//      1 semaine et la veille ;
//   5. un mois avant chaque renouvellement de l'abonnement annuel (19 €),
//      l'annonce du prélèvement ; un mois avant la fin du pack initial sans
//      pacte signé, la proposition de continuer à 19 €/an ;
//   6. deux mois avant la date du rendez-vous annuel, sans abonnement, la
//      proposition de l'abonnement annuel pour ouvrir le module de
//      renouvellement ;
//   7. 2 jours après la fin du premier module, puis 2 jours après la
//      signature du pacte, l'invitation à laisser un avis (bon de 10 € une
//      fois l'avis publié) ;
//   8. le lendemain de la fin du module 5, le code de parrainage du couple.
// Les relances de parcours ne partent que si le module en cours est ouvert ;
// les e-mails du mois partent à tous les couples qui ont signé leur pacte. Chaque membre peut refuser ces rappels
// (profiles.rappels_email) : lien en bas de chaque e-mail ou Mon compte.
// Les textes sont des modèles modifiables depuis l'admin
// (src/lib/modeles-email/catalogue.ts).

const JOUR = 24 * 60 * 60 * 1000
const RELANCES_APRES_JOURS = [10, 20]

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
}

function formaterDate(date: string, locale: Locale) {
  // Date AAAA-MM-JJ lue en UTC pour éviter un décalage d'un jour.
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export interface Membre { id: string; prenom: string | null; email: string | null; rappels_email: boolean; langue: Locale }

export async function membresDuCouple(admin: AdminClient, coupleId: string): Promise<Membre[]> {
  const { data, error } = await admin.from('profiles').select('id, prenom, email, rappels_email').eq('couple_id', coupleId)
  if (error) throw new Error(error.message)
  const langues = await languesDesProfils(admin, (data ?? []).map(m => m.id))
  return (data ?? []).map(m => ({ ...m, langue: langues.get(m.id) ?? 'fr' })) as Membre[]
}

// Rappel : seulement si la personne accepte les rappels ; lien de
// désinscription en bas.
export async function envoyerRappel(destinataire: Membre, cle: string, vars: Variables = {}, etiquette?: string, contenu?: ContenuEmail | null): Promise<boolean> {
  if (!destinataire.email || !destinataire.rappels_email) return false
  return envoyerModele({
    to: destinataire.email,
    cle,
    locale: destinataire.langue,
    vars: { prenom: destinataire.prenom ?? '', ...vars },
    desinscription: destinataire.id,
    etiquette,
    contenu,
  })
}

// ---------------------------------------------------------------------------
// 1. Relance après 10 jours sans avancer
// ---------------------------------------------------------------------------

type EtapeRelance =
  | { type: 'reponses_a_ton_tour'; attendu: Membre; autre: Membre }
  | { type: 'conclusion_a_ton_tour'; attendu: Membre; autre: Membre }
  | { type: 'a_vous_deux'; debrief: boolean }

function modeleRelance(etape: EtapeRelance, pacte: boolean) {
  if (etape.type === 'reponses_a_ton_tour') return 'relance_reponses_a_ton_tour'
  if (etape.type === 'conclusion_a_ton_tour') return pacte ? 'relance_pacte_a_signer' : 'relance_conclusion_a_ton_tour'
  if (!etape.debrief) return 'relance_a_vous_deux'
  return pacte ? 'relance_debrief_pacte' : 'relance_debrief'
}

// Relance d'inactivité due au plus tard à `jusqua` (par défaut maintenant) :
// rien n'est réservé ni envoyé. Sert à l'envoi et, avec une date future, à
// la liste des relances à venir (Vue d'ensemble > Tâches).
export interface RelanceInactivitePrevue {
  coupleId: string
  /** Date à partir de laquelle la relance est due. */
  dueLe: string
  /** Rang de la relance (0 : 10 jours, 1 : 20 jours). */
  rang: number
  modele: string
  destinataires: Membre[]
  /** Variables de l'e-mail, par destinataire. */
  vars: Map<string, Variables>
}

export async function relancesInactivitePrevues(admin: AdminClient, jusqua: number = Date.now()): Promise<RelanceInactivitePrevue[]> {
  const { data: couples, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, derniere_activite_le, derniere_relance_le, relances_inactivite, pacte_signe_le`)
    .is('pacte_signe_le', null)
    .is('compte_resilie_le', null)
    .lt('relances_inactivite', RELANCES_APRES_JOURS.length)
    .lte('derniere_activite_le', new Date(jusqua - RELANCES_APRES_JOURS[0] * JOUR).toISOString())
  if (error) throw new Error(error.message)
  if (!couples?.length) return []

  const modulesParcours = (await getEffectiveModules()).filter(m => m.slug !== MODULE_RDV_ANNUEL)
  const prevues: RelanceInactivitePrevue[] = []

  for (const couple of couples) {
    try {
      const relances = couple.relances_inactivite as number
      // Due après 10 (puis 20) jours sans avancer, et au moins 10 jours
      // après la relance précédente, même pour un couple inactif depuis
      // longtemps.
      const derniereRelance = couple.derniere_relance_le ? new Date(couple.derniere_relance_le as string).getTime() : 0
      const due = Math.max(
        new Date(couple.derniere_activite_le as string).getTime() + RELANCES_APRES_JOURS[relances] * JOUR,
        derniereRelance + RELANCES_APRES_JOURS[0] * JOUR,
      )
      if (due > jusqua) continue

      const membres = await membresDuCouple(admin, couple.id)
      if (membres.length < 2) continue
      // Couple qui n'a jamais commencé : relances de démarrage (1 bis).
      if (!(await coupleACommence(admin, couple.id))) continue

      // Module en cours : le premier module ouvert et pas encore révélé.
      const { data: modules } = await admin.from('modules').select('id, slug, statut, revealed, reponses_partagees').eq('couple_id', couple.id)
      const index = modulesParcours.findIndex(info => {
        const mod = (modules ?? []).find(m => m.slug === info.slug)
        return mod && !mod.revealed && mod.statut !== 'locked'
      })
      if (index < 0) continue
      const info = modulesParcours[index]
      const mod = (modules ?? []).find(m => m.slug === info.slug)!
      // Module payant sans accès en cours : pas de relance pour l'instant.
      if (!peutAccederModule(info, mod, couple as CoupleAbonnement)) continue

      let etape: EtapeRelance
      let href: string
      const base = appUrl()
      const slug = encodeURIComponent(info.slug)
      if (!mod.reponses_partagees) {
        const { data: reponses } = await admin.from('reponses').select('user_id, question_slug, valeur').eq('module_id', mod.id)
        const reponsesClaires = dechiffrerLignes(reponses)
        const fini = (m: Membre) => hasAnsweredAll(info.questions, reponsesClaires.filter(r => r.user_id === m.id))
        const [a, b] = membres
        href = `${base}/module/${slug}`
        if (fini(a) !== fini(b)) {
          const attendu = fini(a) ? b : a
          etape = { type: 'reponses_a_ton_tour', attendu, autre: attendu === a ? b : a }
        } else {
          etape = { type: 'a_vous_deux', debrief: fini(a) && fini(b) }
          if (fini(a) && fini(b)) href = `${base}/module/${slug}/revelation`
        }
      } else {
        const { data: conclusions } = await admin.from('journal_entries').select('user_id, question_slug, valeur').eq('couple_id', couple.id).eq('module_slug', info.slug)
        const conclusionsClaires = dechiffrerLignes(conclusions)
        const conclusionFaite = (m: Membre) => entreesDeFin(info.slug).every(q =>
          conclusionsClaires.some(c => c.user_id === m.id && c.question_slug === q && c.valeur?.trim())
        )
        const [a, b] = membres
        href = `${base}/module/${slug}/revelation`
        if (conclusionFaite(a) !== conclusionFaite(b)) {
          const attendu = conclusionFaite(a) ? b : a
          etape = { type: 'conclusion_a_ton_tour', attendu, autre: attendu === a ? b : a }
        } else {
          etape = { type: 'a_vous_deux', debrief: true }
        }
      }

      const destinataires = (etape.type === 'a_vous_deux' ? membres : [etape.attendu]).filter(d => d.email && d.rappels_email)
      if (!destinataires.length) continue
      const vars = new Map<string, Variables>()
      for (const d of destinataires) {
        const titre = d.langue === 'en' ? info.titre_en ?? info.titre : info.titre
        const partenaire = etape.type === 'a_vous_deux' ? '' : (etape.autre.prenom || t(d.langue, 'L’autre membre de votre couple', 'The other member of your couple'))
        vars.set(d.id, { partenaire, module: titre, numero: index + 1, total: modulesParcours.length, lien: href })
      }
      prevues.push({ coupleId: couple.id, dueLe: new Date(due).toISOString(), rang: relances, modele: modeleRelance(etape, info.slug === MODULE_PACTE), destinataires, vars })
    } catch (e) {
      console.error(`[rappels] relance du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return prevues
}

// `liste` : relances à envoyer (par défaut, celles dues maintenant).
export async function envoyerRelancesInactivite(admin: AdminClient, liste?: RelanceInactivitePrevue[]): Promise<number> {
  const maintenant = Date.now()
  let envoyes = 0
  for (const r of liste ?? await relancesInactivitePrevues(admin, maintenant)) {
    try {
      // Compte la relance avant d'envoyer : jamais deux fois la même, même
      // si la tâche est relancée ou qu'un envoi échoue.
      const { data: reserve } = await admin.from('couples')
        .update({ relances_inactivite: r.rang + 1, derniere_relance_le: new Date(maintenant).toISOString() })
        .eq('id', r.coupleId).eq('relances_inactivite', r.rang)
        .select('id')
      if (!reserve?.length) continue
      for (const d of r.destinataires) {
        if (await envoyerRappel(d, r.modele, r.vars.get(d.id))) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] relance du couple ${r.coupleId} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 1 bis. Inscrit·es qui ne concrétisent pas
// ---------------------------------------------------------------------------

// Deux relances, 3 puis 10 jours après le point de départ :
//   - couple pas encore au complet : depuis l'e-mail de bienvenue (adresse
//     confirmée, code couple reçu) ; envoyé à la personne inscrite, avec le
//     code couple et le lien pour inviter son ou sa partenaire ;
//   - couple au complet sans aucune réponse ni conclusion : depuis
//     l'inscription du second membre ; envoyé aux deux.
// Un palier manqué n'est pas rattrapé en plus du suivant, et rien au-delà de
// 90 jours (on n'écrit pas à des inscrit·es d'il y a longtemps). Chaque envoi
// est noté dans rappels_envoyes (type 'demarrage', clé « non_paire:3 »,
// « jamais_commence:10 »…) : jamais deux fois le même.
const RELANCES_DEMARRAGE_JOURS = [3, 10]
const RELANCES_DEMARRAGE_MAX_JOURS = 90

// Le couple a-t-il déjà enregistré au moins une réponse ou une conclusion ?
export async function coupleACommence(admin: AdminClient, coupleId: string): Promise<boolean> {
  const { data: modules, error } = await admin.from('modules').select('id').eq('couple_id', coupleId)
  if (error) throw new Error(error.message)
  const ids = (modules ?? []).map(m => m.id)
  if (ids.length) {
    const { count, error: reponsesError } = await admin.from('reponses').select('*', { count: 'exact', head: true }).in('module_id', ids)
    if (reponsesError) throw new Error(reponsesError.message)
    if (count) return true
  }
  const { count, error: journalError } = await admin.from('journal_entries').select('*', { count: 'exact', head: true }).eq('couple_id', coupleId)
  if (journalError) throw new Error(journalError.message)
  return !!count
}

// Index du dernier palier atteint (0 : 3 jours, 1 : 10 jours), ou null.
function palierDemarrage(depuis: string | null, maintenant: number): number | null {
  if (!depuis) return null
  const jours = (maintenant - new Date(depuis).getTime()) / JOUR
  if (jours > RELANCES_DEMARRAGE_MAX_JOURS) return null
  for (let i = RELANCES_DEMARRAGE_JOURS.length - 1; i >= 0; i--) {
    if (jours >= RELANCES_DEMARRAGE_JOURS[i]) return i
  }
  return null
}

interface ProfilDemarrage { couple_id: string; created_at: string | null; email_bienvenue_envoye_le: string | null }

// Relance de démarrage due aujourd'hui pour un couple : rien n'est réservé
// ni envoyé (sert aussi à l'aperçu du rattrapage dans l'admin).
export interface RelanceDemarragePrevue {
  coupleId: string
  /** Date à partir de laquelle la relance est due. */
  dueLe: string
  type: 'non_paire' | 'jamais_commence'
  /** Jours du palier atteint (3 ou 10). */
  jours: number
  /** Clé du modèle d'e-mail (relance_non_paire_1…). */
  modele: string
  pairingCode: string | null
  membres: Membre[]
}

// `jusqua` (par défaut maintenant) : date limite, pour la liste des relances
// à venir (Vue d'ensemble > Tâches).
export async function relancesDemarragePrevues(admin: AdminClient, jusqua: number = Date.now()): Promise<RelanceDemarragePrevue[]> {
  const maintenant = Date.now()
  const { data: couples, error } = await admin
    .from('couples')
    .select('id, pairing_code')
    .is('pacte_signe_le', null)
    .is('compte_resilie_le', null)
  if (error) throw new Error(error.message)
  if (!couples?.length) return []

  // Profils et relances déjà envoyées, lus par lots pour ne pas interroger la
  // base couple par couple.
  const profils: ProfilDemarrage[] = []
  const dejaEnvoyees = new Set<string>()
  for (let i = 0; i < couples.length; i += 200) {
    const ids = couples.slice(i, i + 200).map(c => c.id)
    const [{ data: p, error: pError }, { data: r, error: rError }] = await Promise.all([
      admin.from('profiles').select('couple_id, created_at, email_bienvenue_envoye_le').in('couple_id', ids),
      admin.from('rappels_envoyes').select('couple_id, cle').eq('type', 'demarrage').in('couple_id', ids),
    ])
    if (pError) throw new Error(pError.message)
    if (rError) throw new Error(rError.message)
    profils.push(...((p ?? []) as ProfilDemarrage[]))
    for (const { couple_id, cle } of r ?? []) dejaEnvoyees.add(`${couple_id}:${cle}`)
  }

  const prevues: RelanceDemarragePrevue[] = []
  for (const couple of couples) {
    try {
      const duCouple = profils.filter(p => p.couple_id === couple.id)
      let type: RelanceDemarragePrevue['type']
      let depuis: string | null
      if (duCouple.length === 1) {
        // Adresse pas encore confirmée (pas d'e-mail de bienvenue) : rien.
        type = 'non_paire'
        depuis = duCouple[0].email_bienvenue_envoye_le
        if (!couple.pairing_code) continue
      } else if (duCouple.length === 2) {
        type = 'jamais_commence'
        depuis = duCouple.map(p => p.created_at ?? '').sort().at(-1) || null
      } else continue

      // Au-delà de 90 jours : plus rien. Palier atteint à la date limite.
      if (!depuis || (maintenant - new Date(depuis).getTime()) / JOUR > RELANCES_DEMARRAGE_MAX_JOURS) continue
      const palier = palierDemarrage(depuis, jusqua)
      if (palier === null) continue
      // Palier déjà envoyé, ou palier suivant déjà parti.
      if (RELANCES_DEMARRAGE_JOURS.slice(palier).some(j => dejaEnvoyees.has(`${couple.id}:${type}:${j}`))) continue
      if (type === 'jamais_commence' && (await coupleACommence(admin, couple.id))) continue

      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue
      prevues.push({
        coupleId: couple.id,
        dueLe: new Date(new Date(depuis).getTime() + RELANCES_DEMARRAGE_JOURS[palier] * JOUR).toISOString(),
        type,
        jours: RELANCES_DEMARRAGE_JOURS[palier],
        modele: `relance_${type}_${palier + 1}`,
        pairingCode: couple.pairing_code,
        membres,
      })
    } catch (e) {
      console.error(`[rappels] relance de démarrage du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return prevues
}

// Envoie les relances de démarrage dues. Au premier passage (rattrapage),
// chaque inscrit·e des 90 derniers jours qui n'a pas concrétisé reçoit une
// seule relance : celle du palier atteint.
// `liste` : relances à envoyer (par défaut, celles dues maintenant).
export async function envoyerRelancesDemarrage(admin: AdminClient, liste?: RelanceDemarragePrevue[]): Promise<number> {
  const prevues = liste ?? await relancesDemarragePrevues(admin)
  if (!prevues.length) return 0
  const modulesParcours = (await getEffectiveModules()).filter(m => m.slug !== MODULE_RDV_ANNUEL)
  const premier = modulesParcours[0]
  const base = appUrl()
  let envoyes = 0

  for (const r of prevues) {
    try {
      if (!(await reserverEnvoi(admin, r.coupleId, 'demarrage', `${r.type}:${r.jours}`))) continue
      for (const d of r.membres) {
        if (r.type === 'non_paire') {
          if (await envoyerRappel(d, r.modele, { code: r.pairingCode, lien: `${base}/tableau-de-bord#votre-couple` })) envoyes++
        } else {
          const autre = r.membres.find(m => m.id !== d.id)
          const vars = {
            partenaire: autre?.prenom || t(d.langue, 'l’autre membre de votre couple', 'the other member of your couple'),
            module: premier ? (d.langue === 'en' ? premier.titre_en ?? premier.titre : premier.titre) : '',
            lien: premier ? `${base}/module/${encodeURIComponent(premier.slug)}` : `${base}/tableau-de-bord`,
          }
          if (await envoyerRappel(d, r.modele, vars)) envoyes++
        }
      }
    } catch (e) {
      console.error(`[rappels] relance de démarrage du couple ${r.coupleId} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 2. Un e-mail par mois une fois le pacte signé
// ---------------------------------------------------------------------------

// Thème de chaque mois : enregistré au moment de l'envoi dans
// rappels_envoyes (type 'theme_mensuel', cle « <mois>:<clé du thème> »), pour
// retrouver la question du mois sur la page Nos rendez-vous annuels
// (/rdv-annuels). Les mois sans e-mail du mois n'ont pas de thème.
export async function themesDuCouple(admin: AdminClient, coupleId: string): Promise<Map<number, string>> {
  const { data, error } = await admin.from('rappels_envoyes').select('cle').eq('couple_id', coupleId).eq('type', 'theme_mensuel')
  if (error) throw new Error(error.message)
  const themes = new Map<number, string>()
  for (const { cle } of data ?? []) {
    const [mois, theme] = String(cle).split(':')
    if (Number(mois) > 0 && theme) themes.set(Number(mois), theme)
  }
  return themes
}

// Titre et question d'un thème, affichés sur la page Nos rendez-vous
// annuels, où chaque membre du couple note sa réponse.
export function questionDuTheme(cle: string, locale: Locale): { titre: string; question: string } | null {
  const theme = themeMensuelParDefaut(cle)
  return theme ? { titre: theme.objet[locale], question: theme.question[locale] } : null
}

// Nombre de mois entiers écoulés depuis la signature (même jour du mois).
export function moisDepuis(debut: Date, maintenant: Date) {
  let mois = (maintenant.getUTCFullYear() - debut.getUTCFullYear()) * 12 + (maintenant.getUTCMonth() - debut.getUTCMonth())
  if (maintenant.getUTCDate() < debut.getUTCDate()) mois--
  return mois
}


// Date du « mois-anniversaire » de la signature (même jour, ou le dernier
// jour du mois quand il est plus court).
export function dateDuMois(debut: Date, mois: number) {
  const annee = debut.getUTCFullYear()
  const m = debut.getUTCMonth() + mois
  const dernierJour = new Date(Date.UTC(annee, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(annee, m, Math.min(debut.getUTCDate(), dernierJour)))
}

// Mois de calendrier (0 à 11) d'une date AAAA-MM-JJ.
function moisCalendrier(date: string | null | undefined) {
  return date ? Number(date.slice(5, 7)) - 1 : null
}

// Pas d'e-mail du mois quand il tombe le mois des fêtes de fin d'année, de la Saint-Valentin,
// d'un anniversaire de couple ou de mariage, ou du rendez-vous annuel : ces
// mois-là ont déjà leur propre e-mail. Renvoie la raison, ou null.
export function raisonMoisSansTheme(echeance: Date, couple: { date_anniversaire?: string | null; date_mariage?: string | null; rdv_annuel_le?: string | null }): string | null {
  const mois = echeance.getUTCMonth()
  if (mois === 11) return 'noel'
  if (mois === 1) return 'saint_valentin'
  if (moisCalendrier(couple.date_anniversaire) === mois) return 'anniversaire_couple'
  if (moisCalendrier(couple.date_mariage) === mois) return 'anniversaire_mariage'
  const rdv = couple.rdv_annuel_le
  if (rdv && Number(rdv.slice(0, 4)) === echeance.getUTCFullYear() && moisCalendrier(rdv) === mois) return 'rdv_annuel'
  return null
}

// Annonce du rendez-vous annuel quand il tombe dans les 31 jours (elle
// remplace l'e-mail du mois). abonne : abonnement annuel (ou accès gratuit)
// en cours, qui ouvre le module de renouvellement ; sinon, l'annonce le
// rappelle.
function annonceRdv(rdvLe: string, joursAvantRdv: number, abonne: boolean, locale: Locale): { cle: string; vars: Variables } {
  const base = appUrl()
  return {
    cle: 'rdv_annuel_approche',
    vars: {
      date: formaterDate(rdvLe, locale),
      jours: t(locale, `${joursAvantRdv} jour${joursAvantRdv > 1 ? 's' : ''}`, `${joursAvantRdv} day${joursAvantRdv > 1 ? 's' : ''}`),
      lien: abonne ? `${base}/journal` : `${base}/journal#rdv-annuel-offre`,
      abonnement_rdv: abonne ? '' : t(locale,
        'Pour ouvrir ce module, il faut l’abonnement « Pacte – notre rendez-vous annuel » (19 € par an), à prendre depuis votre page Notre Pacte.',
        'To open this module, you need the "Pact – our yearly date" subscription (€19 per year), available from your Our Pact page.'),
    },
  }
}

function varsTheme(mois: number, rdvLe: string | null, joursAvantRdv: number | null, locale: Locale): Variables {
  const base = appUrl()
  const rappelRdv = rdvLe && joursAvantRdv !== null && joursAvantRdv > 0
    ? t(locale, `Prochain rendez-vous annuel : le ${formaterDate(rdvLe, locale)}.`, `Next yearly date: ${formaterDate(rdvLe, locale)}.`)
    : ''
  return {
    rappel_rdv: rappelRdv,
    lien: `${base}/rdv-annuels#mois-${mois}`,
    lien_pacte: `${base}/journal`,
    lien_intimite: `${base}/module/intimite/revelation`,
  }
}

export async function envoyerRappelsMensuels(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const { data: couples, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, pacte_signe_le, rdv_annuel_le, date_anniversaire, date_mariage`)
    .not('pacte_signe_le', 'is', null)
    .is('compte_resilie_le', null)
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      // Envoyés à tous les couples qui ont signé leur pacte, avec ou sans
      // abonnement annuel. Le thème est attribué même si personne ne reçoit
      // les rappels : la question du mois s'affiche sur /rdv-annuels.
      const signeLe = new Date(couple.pacte_signe_le as string)
      const mois = moisDepuis(signeLe, maintenant)
      if (mois < 1) continue

      const rdvLe = (couple.rdv_annuel_le as string | null) ?? null
      const joursAvantRdv = rdvLe
        ? Math.ceil((new Date(`${rdvLe}T00:00:00Z`).getTime() - Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())) / JOUR)
        : null
      const annonce = rdvLe !== null && joursAvantRdv !== null && joursAvantRdv > 0 && joursAvantRdv <= 31

      // Sans annonce du rendez-vous : pas d'e-mail du mois les mois de fête,
      // d'anniversaire ou de rendez-vous annuel, ni une fois tous les thèmes
      // envoyés (pas de boucle).
      let theme: string | undefined
      if (!annonce) {
        if (raisonMoisSansTheme(dateDuMois(signeLe, mois), couple)) continue
        const themes = await themesDuCouple(admin, couple.id)
        if (themes.has(mois)) continue
        const dejaEnvoyes = new Set(themes.values())
        theme = CLES_THEMES_MENSUELS.find(cle => !dejaEnvoyes.has(cle))
        if (!theme) continue
      }

      // Réserve l'envoi du mois avant de le faire : jamais deux fois le même.
      if (!(await reserverEnvoi(admin, couple.id, 'mensuel', String(mois)))) continue
      if (theme) {
        const { error: themeError } = await admin.from('rappels_envoyes').insert({ couple_id: couple.id, type: 'theme_mensuel', cle: `${mois}:${theme}` })
        if (themeError) {
          // Thème pas enregistré (SQL pas encore exécuté ?) : on libère le
          // mois pour réessayer demain plutôt que d'envoyer une question
          // introuvable sur /rdv-annuels.
          await admin.from('rappels_envoyes').delete().eq('couple_id', couple.id).eq('type', 'mensuel').eq('cle', String(mois))
          throw new Error(themeError.message)
        }
      }

      const membres = await membresDuCouple(admin, couple.id)
      for (const d of membres) {
        const autre = membres.find(m => m.id !== d.id)
        const { cle, vars } = theme
          ? { cle: theme, vars: varsTheme(mois, rdvLe, joursAvantRdv, d.langue) }
          : annonceRdv(rdvLe!, joursAvantRdv!, aAccesComplet(couple as CoupleAbonnement), d.langue)
        if (await envoyerRappel(d, cle, { ...vars, partenaire: autre?.prenom || t(d.langue, 'l’autre membre de votre couple', 'the other member of your couple') })) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] e-mail mensuel du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 2 bis. Fêtes de fin d'année (clé « noel ») et Saint-Valentin
// ---------------------------------------------------------------------------

// Envoyés chaque année aux couples qui ont signé leur pacte, à partir du jour
// `debut` (rattrapés jusqu'au jour `fin` si la tâche planifiée a manqué un
// jour). Les mois de décembre et février n'ont pas d'e-mail du mois.
const FETES: { cle: string; mois: number; debut: number; fin: number }[] = [
  { cle: 'noel', mois: 11, debut: 10, fin: 24 },
  { cle: 'saint_valentin', mois: 1, debut: 7, fin: 13 },
]

export async function envoyerEmailsFetes(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const fete = FETES.find(f => f.mois === maintenant.getUTCMonth() && maintenant.getUTCDate() >= f.debut && maintenant.getUTCDate() <= f.fin)
  if (!fete) return 0

  const { data: couples, error } = await admin
    .from('couples')
    .select('id')
    .not('pacte_signe_le', 'is', null)
    .is('compte_resilie_le', null)
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue
      if (!(await reserverEnvoi(admin, couple.id, 'fete', `${fete.cle}:${maintenant.getUTCFullYear()}`))) continue
      for (const d of membres) {
        const autre = membres.find(m => m.id !== d.id)
        if (await envoyerRappel(d, fete.cle, { partenaire: autre?.prenom || t(d.langue, 'l’autre membre de votre couple', 'the other member of your couple') })) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] e-mail de ${fete.cle} du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 3. Proposition de passer à l'abonnement annuel, 5 jours avant la fin du mois
// ---------------------------------------------------------------------------

const BASCULE_ANNUELLE_JOURS_AVANT = 5


export async function envoyerPropositionsAnnuel(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const aujourdhui = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  const limite = new Date(aujourdhui + (BASCULE_ANNUELLE_JOURS_AVANT + 1) * JOUR).toISOString()
  const { data: couples, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, pacte_signe_le, rdv_annuel_le, subscription_formule, subscription_annuel_prevu_le`)
    .not('pacte_signe_le', 'is', null)
    .is('compte_resilie_le', null)
    .eq('subscription_status', 'actif')
    .gt('subscription_current_period_end', maintenant.toISOString())
    .lt('subscription_current_period_end', limite)
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      const finPeriode = couple.subscription_current_period_end as string
      const joursAvantFin = Math.ceil((new Date(finPeriode).getTime() - aujourdhui) / JOUR)
      if (joursAvantFin < 1 || joursAvantFin > BASCULE_ANNUELLE_JOURS_AVANT) continue
      // Uniquement un abonnement mensuel en cours : proposition si la bascule
      // n'est pas programmée, simple information (rien à faire) si elle
      // l'est déjà (programmée d'office à la signature du pacte).
      const annuelPrevuLe = (couple.subscription_annuel_prevu_le as string | null) ?? null
      const offre = offreRdvAnnuel(couple as CoupleAbonnement, {
        formule: (couple.subscription_formule as 'mensuel' | 'annuel' | null) ?? null,
        annuelPrevuLe,
      }, true)
      if (!offre.mensuelEnCours) continue
      const dejaProgrammee = !!annuelPrevuLe
      if (!dejaProgrammee && !offre.afficher) continue

      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue

      // Une seule proposition par fin de mois.
      const { data: reserve, error: reserveError } = await admin
        .from('rappels_envoyes')
        .upsert({ couple_id: couple.id, type: 'bascule_annuelle', cle: finPeriode.slice(0, 10) }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
        .select('couple_id')
      if (reserveError) throw new Error(reserveError.message)
      if (!reserve?.length) continue

      const rdvLe = (couple.rdv_annuel_le as string | null) ?? null
      for (const d of membres) {
        const vars = {
          date: formaterDate(finPeriode, d.langue),
          precision_rdv: rdvLe ? t(d.langue, `, le ${formaterDate(rdvLe, d.langue)}`, `, on ${formaterDate(rdvLe, d.langue)}`) : '',
          lien: dejaProgrammee ? `${appUrl()}/mon-compte` : `${appUrl()}/journal#rdv-annuel-offre`,
        }
        if (await envoyerRappel(d, dejaProgrammee ? 'bascule_annuelle_programmee' : 'bascule_annuelle_proposition', vars)) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] proposition annuelle du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

export function rappelsConfigures() {
  return mailConfigure()
}

// ---------------------------------------------------------------------------
// 4. Avertissements avant l'effacement des données (24 mois d'inactivité)
// ---------------------------------------------------------------------------

// Jours avant l'effacement : 2 mois, 1 mois, 1 semaine, la veille.
const AVERTISSEMENTS_EFFACEMENT_JOURS = [60, 30, 7, 1]


// E-mail de service (obligation d'information avant effacement) : envoyé à
// chaque membre, même si les rappels sont désactivés.
async function envoyerAvisService(destinataire: Membre, effacementLe: string, jours: number): Promise<boolean> {
  if (!destinataire.email) return false
  const locale = destinataire.langue
  const date = formaterDate(effacementLe, locale)
  return envoyerModele({
    to: destinataire.email,
    cle: 'effacement_donnees',
    locale,
    vars: {
      prenom: destinataire.prenom ?? '',
      quand: jours <= 1 ? t(locale, 'demain', 'tomorrow') : t(locale, `le ${date}`, `on ${date}`),
      lien: `${appUrl()}/mon-compte`,
    },
  })
}

export async function envoyerAvertissementsEffacement(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const aujourdhui = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  const limite = new Date(aujourdhui + (AVERTISSEMENTS_EFFACEMENT_JOURS[0] + 1) * JOUR).toISOString()
  const { data: couples, error } = await admin
    .from('couples')
    .select('id, effacement_prevu_le')
    .not('effacement_prevu_le', 'is', null)
    .gt('effacement_prevu_le', maintenant.toISOString())
    .lt('effacement_prevu_le', limite)
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      const effacementLe = couple.effacement_prevu_le as string
      const joursAvant = Math.ceil((new Date(effacementLe).getTime() - aujourdhui) / JOUR)
      // Palier le plus proche atteint (un palier manqué n'est pas rattrapé
      // en plus du suivant).
      const palier = [...AVERTISSEMENTS_EFFACEMENT_JOURS].reverse().find(j => joursAvant <= j)
      if (!palier) continue

      // Un seul envoi par palier et par date d'effacement (après une visite,
      // la date est repoussée et tout repart).
      const { data: reserve, error: reserveError } = await admin
        .from('rappels_envoyes')
        .upsert({ couple_id: couple.id, type: 'effacement_donnees', cle: `${effacementLe.slice(0, 10)}:${palier}` }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
        .select('couple_id')
      if (reserveError) throw new Error(reserveError.message)
      if (!reserve?.length) continue

      for (const d of await membresDuCouple(admin, couple.id)) {
        if (await envoyerAvisService(d, effacementLe, joursAvant)) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] avertissement d'effacement du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 5. Un mois avant le renouvellement de l'abonnement annuel, ou la fin du pack
// ---------------------------------------------------------------------------

const RENOUVELLEMENT_JOURS_AVANT = 30

// Réserve l'envoi pour cette échéance : jamais deux fois le même.
async function reserverEnvoi(admin: AdminClient, coupleId: string, type: string, cle: string): Promise<boolean> {
  const { data, error } = await admin
    .from('rappels_envoyes')
    .upsert({ couple_id: coupleId, type, cle }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
    .select('couple_id')
  if (error) throw new Error(error.message)
  return !!data?.length
}

// Abonnement annuel en cours dont le renouvellement automatique n'est pas
// arrêté : annonce du prélèvement de 19 € un mois avant. E-mail de service
// (information avant renouvellement, promise dans les CGV) : envoyé à chaque
// membre, même si les rappels sont désactivés. Pack initial qui se termine
// dans un mois sans pacte signé : proposition de continuer à 19 €/an.
export async function envoyerAnnoncesRenouvellement(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const aujourdhui = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  const limite = new Date(aujourdhui + (RENOUVELLEMENT_JOURS_AVANT + 1) * JOUR).toISOString()
  const dansLaFenetre = (date: string) => {
    const jours = Math.ceil((new Date(date).getTime() - aujourdhui) / JOUR)
    return jours >= 1 && jours <= RENOUVELLEMENT_JOURS_AVANT
  }
  let envoyes = 0

  const { data: abonnes, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, subscription_formule`)
    .is('compte_resilie_le', null)
    .eq('subscription_status', 'actif')
    .eq('subscription_formule', 'annuel')
    .eq('subscription_cancel_at_period_end', false)
    .gt('subscription_current_period_end', maintenant.toISOString())
    .lt('subscription_current_period_end', limite)
  if (error) throw new Error(error.message)

  for (const couple of abonnes ?? []) {
    try {
      const echeance = couple.subscription_current_period_end as string
      if (!dansLaFenetre(echeance)) continue
      if (!(await reserverEnvoi(admin, couple.id, 'renouvellement_annuel', echeance.slice(0, 10)))) continue
      for (const d of await membresDuCouple(admin, couple.id)) {
        if (!d.email) continue
        const ok = await envoyerModele({
          to: d.email,
          cle: 'renouvellement_annuel_annonce',
          locale: d.langue,
          vars: { prenom: d.prenom ?? '', date: formaterDate(echeance, d.langue), lien: `${appUrl()}/mon-compte` },
        })
        if (ok) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] annonce du renouvellement du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Pack initial (acheté ou offert) qui se termine dans un mois, pacte pas
  // encore signé et sans abonnement : proposition de continuer à 19 €/an.
  const { data: packs, error: packsError } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, pacte_signe_le`)
    .is('compte_resilie_le', null)
    .is('pacte_signe_le', null)
    .gt('pack_initial_expire_le', maintenant.toISOString())
    .lt('pack_initial_expire_le', limite)
  if (packsError) throw new Error(packsError.message)

  for (const couple of packs ?? []) {
    try {
      const fin = couple.pack_initial_expire_le as string
      if (!dansLaFenetre(fin) || aAccesComplet(couple as CoupleAbonnement)) continue
      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue
      if (!(await reserverEnvoi(admin, couple.id, 'fin_pack_initial', fin.slice(0, 10)))) continue
      for (const d of membres) {
        if (await envoyerRappel(d, 'fin_pack_initial', { date: formaterDate(fin, d.langue), lien: `${appUrl()}/abonnement` })) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] fin du pack initial du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 6. Deux mois avant le rendez-vous annuel : proposition de l'abonnement
// ---------------------------------------------------------------------------

const PROPOSITION_RDV_JOURS_AVANT = 61

// Pacte signé, sans abonnement annuel (ni accès gratuit) : 2 mois avant la
// date du rendez-vous annuel choisie par le couple, rappel que le module de
// renouvellement demande l'abonnement « Pacte – notre rendez-vous annuel »
// (19 €/an). Une seule fois par date de rendez-vous.
export async function envoyerPropositionsRdvAnnuel(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const aujourdhui = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  const limite = new Date(aujourdhui + (PROPOSITION_RDV_JOURS_AVANT + 1) * JOUR).toISOString().slice(0, 10)
  const { data: couples, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, pacte_signe_le, rdv_annuel_le`)
    .not('pacte_signe_le', 'is', null)
    .is('compte_resilie_le', null)
    .gt('rdv_annuel_le', new Date(aujourdhui).toISOString().slice(0, 10))
    .lt('rdv_annuel_le', limite)
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      const rdvLe = couple.rdv_annuel_le as string
      const jours = Math.ceil((new Date(`${rdvLe.slice(0, 10)}T00:00:00Z`).getTime() - aujourdhui) / JOUR)
      if (jours < 1 || jours > PROPOSITION_RDV_JOURS_AVANT) continue
      if (aAccesComplet(couple as CoupleAbonnement)) continue
      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue
      if (!(await reserverEnvoi(admin, couple.id, 'proposition_rdv_annuel', rdvLe.slice(0, 10)))) continue
      for (const d of membres) {
        if (await envoyerRappel(d, 'rdv_annuel_abonnement', { date: formaterDate(rdvLe, d.langue), lien: `${appUrl()}/journal#rdv-annuel-offre` })) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] proposition de l'abonnement annuel du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 7. Demandes d'avis : après le premier module, puis après le pacte
// ---------------------------------------------------------------------------

// Invitation à laisser un avis sur /avis, avec le rappel qu'un avis publié
// rapporte un bon de 10 € (pack initial ou abonnement annuel), envoyée :
//   - 2 jours après la fin du premier module (réponses dévoilées et
//     conclusions des deux écrites) ;
//   - 2 jours après la signature du pacte par les deux.
// Chacune une seule fois par couple (rappels_envoyes, type 'demande_avis',
// clé « <slug du premier module> » ou « pacte »), jamais aux personnes qui
// ont déjà laissé un avis, et rien au-delà de 60 jours (pas de rattrapage
// des couples d'il y a longtemps).
// Module terminé : réponses dévoilées ET conclusions des deux membres écrites.
async function conclusionsEcrites(admin: AdminClient, coupleId: string, slug: string, membres: Membre[]): Promise<boolean> {
  const { data: conclusions, error } = await admin.from('journal_entries').select('user_id, question_slug, valeur').eq('couple_id', coupleId).eq('module_slug', slug)
  if (error) throw new Error(error.message)
  const claires = dechiffrerLignes(conclusions)
  return membres.every(m => entreesDeFin(slug).every(q => claires.some(c => c.user_id === m.id && c.question_slug === q && c.valeur?.trim())))
}

const DEMANDE_AVIS_APRES_JOURS = 2
const DEMANDE_AVIS_MAX_JOURS = 60

// E-mail prévu (demande d'avis ou parrainage) : rien n'est réservé ni envoyé.
export interface EnvoiPrevu {
  coupleId: string
  /** Date à partir de laquelle l'e-mail est dû. */
  dueLe: string
  /** Clé de l'envoi dans rappels_envoyes. */
  cle: string
  modele: string
  destinataires: Membre[]
  vars: Map<string, Variables>
}

// Demandes d'avis dues au plus tard à `jusqua` (par défaut maintenant).
export async function demandesAvisPrevues(admin: AdminClient, jusqua: number = Date.now()): Promise<EnvoiPrevu[]> {
  const maintenant = Date.now()
  const depuis = new Date(maintenant - DEMANDE_AVIS_MAX_JOURS * JOUR).toISOString()
  const limite = new Date(jusqua - DEMANDE_AVIS_APRES_JOURS * JOUR).toISOString()
  const premier = (await getEffectiveModules()).filter(m => m.slug !== MODULE_RDV_ANNUEL)[0]

  // Couples concernés, avec la date de la fin du module ou de la signature.
  const aTraiter: { coupleId: string; le: string; cle: string; modele: string }[] = []
  if (premier) {
    const { data, error } = await admin.from('modules').select('couple_id, revealed_at')
      .eq('slug', premier.slug).eq('revealed', true)
      .gte('revealed_at', depuis).lte('revealed_at', limite)
    if (error) throw new Error(error.message)
    for (const m of data ?? []) aTraiter.push({ coupleId: m.couple_id, le: m.revealed_at as string, cle: premier.slug, modele: 'demande_avis' })
  }
  const { data: signes, error: signesError } = await admin.from('couples').select('id, pacte_signe_le')
    .is('compte_resilie_le', null).gte('pacte_signe_le', depuis).lte('pacte_signe_le', limite)
  if (signesError) throw new Error(signesError.message)
  for (const c of signes ?? []) aTraiter.push({ coupleId: c.id, le: c.pacte_signe_le as string, cle: 'pacte', modele: 'demande_avis_pacte' })

  const prevues: EnvoiPrevu[] = []
  for (const { coupleId, le, cle, modele } of aTraiter) {
    try {
      const { data: couple } = await admin.from('couples').select('compte_resilie_le').eq('id', coupleId).maybeSingle()
      if (!couple || couple.compte_resilie_le) continue
      const { data: deja } = await admin.from('rappels_envoyes').select('cle').eq('couple_id', coupleId).eq('type', 'demande_avis').eq('cle', cle).limit(1)
      if (deja?.length) continue

      const membres = await membresDuCouple(admin, coupleId)
      if (membres.length < 2) continue
      // Premier module vraiment terminé : conclusions des deux écrites.
      if (cle !== 'pacte' && premier && !(await conclusionsEcrites(admin, coupleId, premier.slug, membres))) continue

      // Pas aux personnes qui ont déjà laissé un avis.
      const { data: avis } = await admin.from('avis').select('profile_id').in('profile_id', membres.map(m => m.id))
      const ontDonneAvis = new Set((avis ?? []).map(a => a.profile_id))
      const destinataires = membres.filter(m => !ontDonneAvis.has(m.id) && m.rappels_email && m.email)
      if (!destinataires.length) continue
      const vars = new Map<string, Variables>()
      for (const d of destinataires) vars.set(d.id, { module: premier ? (d.langue === 'en' ? premier.titre_en ?? premier.titre : premier.titre) : '' })
      prevues.push({ coupleId, dueLe: new Date(new Date(le).getTime() + DEMANDE_AVIS_APRES_JOURS * JOUR).toISOString(), cle, modele, destinataires, vars })
    } catch (e) {
      console.error(`[rappels] demande d'avis (${cle}) du couple ${coupleId} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return prevues
}

export async function envoyerDemandesAvis(admin: AdminClient): Promise<number> {
  return envoyerPrevus(admin, await demandesAvisPrevues(admin), 'demande_avis')
}

// Réserve puis envoie des e-mails prévus (une seule fois par couple et par clé).
async function envoyerPrevus(admin: AdminClient, prevus: EnvoiPrevu[], type: string): Promise<number> {
  let envoyes = 0
  for (const p of prevus) {
    try {
      if (!(await reserverEnvoi(admin, p.coupleId, type, p.cle))) continue
      for (const d of p.destinataires) {
        if (await envoyerRappel(d, p.modele, p.vars.get(d.id))) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] ${type} du couple ${p.coupleId} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// 8. Parrainage, une fois le module 5 terminé
// ---------------------------------------------------------------------------

// Le lendemain de la fin du 5e module (réponses dévoilées, conclusions des
// deux) : le code de parrainage du couple et la règle (tous les 5 couples
// inscrits avec ce code, 10 € de réduction). Une seule fois par couple
// (rappels_envoyes, type 'parrainage', clé = slug du module), rien pour un
// module terminé il y a plus de 60 jours.
const PARRAINAGE_APRES_MODULE = 5
const PARRAINAGE_MAX_JOURS = 60

// E-mails de parrainage dus au plus tard à `jusqua` (par défaut maintenant).
export async function parrainagesPrevus(admin: AdminClient, jusqua: number = Date.now()): Promise<EnvoiPrevu[]> {
  const maintenant = Date.now()
  const module = (await getEffectiveModules()).filter(m => m.slug !== MODULE_RDV_ANNUEL)[PARRAINAGE_APRES_MODULE - 1]
  if (!module) return []
  const { data: modules, error } = await admin.from('modules').select('couple_id, revealed_at')
    .eq('slug', module.slug).eq('revealed', true)
    .gte('revealed_at', new Date(maintenant - PARRAINAGE_MAX_JOURS * JOUR).toISOString())
    .lte('revealed_at', new Date(jusqua).toISOString())
  if (error) throw new Error(error.message)

  const prevues: EnvoiPrevu[] = []
  for (const { couple_id: coupleId, revealed_at: le } of modules ?? []) {
    try {
      const { data: couple } = await admin.from('couples').select('code_parrainage, compte_resilie_le').eq('id', coupleId).maybeSingle()
      if (!couple?.code_parrainage || couple.compte_resilie_le) continue
      const { data: deja } = await admin.from('rappels_envoyes').select('cle').eq('couple_id', coupleId).eq('type', 'parrainage').limit(1)
      if (deja?.length) continue
      const membres = await membresDuCouple(admin, coupleId)
      if (membres.length < 2) continue
      const destinataires = membres.filter(m => m.rappels_email && m.email)
      if (!destinataires.length) continue
      if (!(await conclusionsEcrites(admin, coupleId, module.slug, membres))) continue
      const vars = new Map<string, Variables>()
      for (const d of destinataires) {
        vars.set(d.id, { code_parrainage: couple.code_parrainage, numero: PARRAINAGE_APRES_MODULE, module: d.langue === 'en' ? module.titre_en ?? module.titre : module.titre })
      }
      prevues.push({ coupleId, dueLe: le as string, cle: module.slug, modele: 'parrainage_module_5', destinataires, vars })
    } catch (e) {
      console.error(`[rappels] e-mail de parrainage du couple ${coupleId} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return prevues
}

export async function envoyerEmailsParrainage(admin: AdminClient): Promise<number> {
  return envoyerPrevus(admin, await parrainagesPrevus(admin), 'parrainage')
}

// ---------------------------------------------------------------------------
// Envoi immédiat d'un e-mail prévu (Vue d'ensemble > Tâches)
// ---------------------------------------------------------------------------

export type SortePrevue = 'inactivite' | 'demarrage' | 'avis' | 'parrainage'

// Horizon de la liste des e-mails à venir (3 jours), avec un jour de marge.
const HORIZON_ENVOI_IMMEDIAT_JOURS = 4

// Envoie tout de suite un e-mail qui serait parti dans les prochains jours,
// avec la même réservation que la tâche du matin (il ne repartira pas).
// Renvoie le nombre d'e-mails envoyés, ou null s'il n'est plus prévu
// (réponse enregistrée, avis laissé, déjà envoyé…).
export async function envoyerPrevuMaintenant(admin: AdminClient, sorte: SortePrevue, coupleId: string, cle?: string): Promise<number | null> {
  const horizon = Date.now() + HORIZON_ENVOI_IMMEDIAT_JOURS * JOUR
  if (sorte === 'inactivite') {
    const liste = (await relancesInactivitePrevues(admin, horizon)).filter(r => r.coupleId === coupleId)
    return liste.length ? envoyerRelancesInactivite(admin, liste) : null
  }
  if (sorte === 'demarrage') {
    const liste = (await relancesDemarragePrevues(admin, horizon)).filter(r => r.coupleId === coupleId)
    return liste.length ? envoyerRelancesDemarrage(admin, liste) : null
  }
  if (sorte === 'avis') {
    const liste = (await demandesAvisPrevues(admin, horizon)).filter(r => r.coupleId === coupleId && (!cle || r.cle === cle))
    return liste.length ? envoyerPrevus(admin, liste, 'demande_avis') : null
  }
  const liste = (await parrainagesPrevus(admin, horizon)).filter(r => r.coupleId === coupleId)
  return liste.length ? envoyerPrevus(admin, liste, 'parrainage') : null
}
