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
import { cleThemeMensuel, NOMBRE_THEMES_MENSUELS, themeMensuelParDefaut } from '@/lib/modeles-email/catalogue'
import type { Variables } from '@/lib/modeles-email/rendu'

// Le lien de désinscription est signé dans src/lib/desinscription.ts.
export { signatureDesinscription, verifierSignatureDesinscription } from '@/lib/desinscription'

type AdminClient = ReturnType<typeof createAdminClient>

// E-mails de rappel envoyés par la tâche planifiée quotidienne
// /api/cron/rappels-email :
//   1. relance quand un couple n'a pas avancé dans son parcours depuis
//      10 jours (puis une seconde à 20 jours, pas plus) ;
//   2. une fois le pacte signé, un e-mail par mois pour faire vivre les
//      engagements, et l'annonce du rendez-vous annuel un mois avant ;
//   3. une fois le pacte signé, 5 jours avant la fin du mois payé, la
//      proposition de passer de l'abonnement mensuel à l'abonnement annuel
//      (« Pacte – notre rendez-vous annuel », bascule Stripe programmée
//      depuis la page Notre Pacte) ;
//   4. avant l'effacement des données (après 24 mois d'inactivité, cf.
//      src/lib/conservation.ts), un avertissement 2 mois, 1 mois,
//      1 semaine et la veille.
// Uniquement pour les couples dont l'accès est en cours (les relances après
// résiliation viendront plus tard). Chaque membre peut refuser ces rappels
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
export async function envoyerRappel(destinataire: Membre, cle: string, vars: Variables = {}, etiquette?: string): Promise<boolean> {
  if (!destinataire.email || !destinataire.rappels_email) return false
  return envoyerModele({
    to: destinataire.email,
    cle,
    locale: destinataire.langue,
    vars: { prenom: destinataire.prenom ?? '', ...vars },
    desinscription: destinataire.id,
    etiquette,
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

export async function envoyerRelancesInactivite(admin: AdminClient): Promise<number> {
  const maintenant = Date.now()
  const { data: couples, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, derniere_activite_le, derniere_relance_le, relances_inactivite, pacte_signe_le`)
    .is('pacte_signe_le', null)
    .is('compte_resilie_le', null)
    .lt('relances_inactivite', RELANCES_APRES_JOURS.length)
    .lte('derniere_activite_le', new Date(maintenant - RELANCES_APRES_JOURS[0] * JOUR).toISOString())
  if (error) throw new Error(error.message)
  if (!couples?.length) return 0

  const modulesParcours = (await getEffectiveModules()).filter(m => m.slug !== MODULE_RDV_ANNUEL)
  let envoyes = 0

  for (const couple of couples) {
    try {
      const relances = couple.relances_inactivite as number
      const inactifDepuis = maintenant - new Date(couple.derniere_activite_le as string).getTime()
      if (inactifDepuis < RELANCES_APRES_JOURS[relances] * JOUR) continue
      // Au moins 10 jours entre deux relances, même pour un couple déjà
      // inactif depuis longtemps.
      const derniereRelance = couple.derniere_relance_le ? new Date(couple.derniere_relance_le as string).getTime() : 0
      if (maintenant - derniereRelance < RELANCES_APRES_JOURS[0] * JOUR) continue

      const membres = await membresDuCouple(admin, couple.id)
      if (membres.length < 2) continue

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

      // Compte la relance avant d'envoyer : jamais deux fois la même, même
      // si la tâche est relancée ou qu'un envoi échoue.
      const { data: reserve } = await admin.from('couples')
        .update({ relances_inactivite: relances + 1, derniere_relance_le: new Date(maintenant).toISOString() })
        .eq('id', couple.id).eq('relances_inactivite', relances)
        .select('id')
      if (!reserve?.length) continue

      const destinataires = etape.type === 'a_vous_deux' ? membres : [etape.attendu]
      for (const d of destinataires) {
        const titre = d.langue === 'en' ? info.titre_en ?? info.titre : info.titre
        const partenaire = etape.type === 'a_vous_deux' ? '' : (etape.autre.prenom || t(d.langue, 'L’autre membre de votre couple', 'The other member of your couple'))
        if (await envoyerRappel(d, modeleRelance(etape, info.slug === MODULE_PACTE), { partenaire, module: titre, numero: index + 1, total: modulesParcours.length, lien: href })) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] relance du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}


// ---------------------------------------------------------------------------
// 2. Un e-mail par mois une fois le pacte signé
// ---------------------------------------------------------------------------

// Thème du mois : dans l'ordre à partir du 1er mois après la signature, puis
// on reboucle (à partir du 2e). Les thèmes sont les modèles « mensuel_1 »,
// « mensuel_2 »… du catalogue.
function indexTheme(mois: number) {
  const n = NOMBRE_THEMES_MENSUELS
  return mois <= n ? mois - 1 : 1 + ((mois - 2) % (n - 1))
}

// Titre et question du mois, affichés sur la page Nos rendez-vous annuels
// (/rdv-annuels), où chaque membre du couple note sa réponse.
export function questionDuMois(mois: number, locale: Locale): { titre: string; question: string } {
  const theme = themeMensuelParDefaut(indexTheme(mois))
  return { titre: theme.objet[locale], question: theme.question[locale] }
}

// Nombre de mois entiers écoulés depuis la signature (même jour du mois).
export function moisDepuis(debut: Date, maintenant: Date) {
  let mois = (maintenant.getUTCFullYear() - debut.getUTCFullYear()) * 12 + (maintenant.getUTCMonth() - debut.getUTCMonth())
  if (maintenant.getUTCDate() < debut.getUTCDate()) mois--
  return mois
}


function modeleMensuel(mois: number, rdvLe: string | null, joursAvantRdv: number | null, locale: Locale): { cle: string; vars: Variables } {
  const base = appUrl()
  if (rdvLe && joursAvantRdv !== null && joursAvantRdv > 0 && joursAvantRdv <= 31) {
    return {
      cle: 'rdv_annuel_approche',
      vars: {
        date: formaterDate(rdvLe, locale),
        jours: t(locale, `${joursAvantRdv} jour${joursAvantRdv > 1 ? 's' : ''}`, `${joursAvantRdv} day${joursAvantRdv > 1 ? 's' : ''}`),
        lien: `${base}/journal`,
      },
    }
  }
  const rappelRdv = rdvLe && joursAvantRdv !== null && joursAvantRdv > 0
    ? t(locale, `Prochain rendez-vous annuel : le ${formaterDate(rdvLe, locale)}.`, `Next yearly date: ${formaterDate(rdvLe, locale)}.`)
    : ''
  return {
    cle: cleThemeMensuel(indexTheme(mois)),
    vars: { rappel_rdv: rappelRdv, lien: `${base}/rdv-annuels`, lien_pacte: `${base}/journal` },
  }
}

export async function envoyerRappelsMensuels(admin: AdminClient): Promise<number> {
  const maintenant = new Date()
  const { data: couples, error } = await admin
    .from('couples')
    .select(`${ABONNEMENT_COLONNES}, pacte_signe_le, rdv_annuel_le`)
    .not('pacte_signe_le', 'is', null)
    .is('compte_resilie_le', null)
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      // E-mails arrêtés quand l'accès est terminé (relances après
      // résiliation : plus tard).
      if (!aAccesComplet(couple as CoupleAbonnement)) continue
      const mois = moisDepuis(new Date(couple.pacte_signe_le as string), maintenant)
      if (mois < 1) continue

      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue

      // Réserve l'envoi du mois avant de le faire : jamais deux fois le même.
      const { data: reserve, error: reserveError } = await admin
        .from('rappels_envoyes')
        .upsert({ couple_id: couple.id, type: 'mensuel', cle: String(mois) }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
        .select('couple_id')
      if (reserveError) throw new Error(reserveError.message)
      if (!reserve?.length) continue

      const rdvLe = (couple.rdv_annuel_le as string | null) ?? null
      const joursAvantRdv = rdvLe
        ? Math.ceil((new Date(`${rdvLe}T00:00:00Z`).getTime() - Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())) / JOUR)
        : null

      for (const d of membres) {
        const autre = membres.find(m => m.id !== d.id)
        const { cle, vars } = modeleMensuel(mois, rdvLe, joursAvantRdv, d.langue)
        if (await envoyerRappel(d, cle, { ...vars, partenaire: autre?.prenom || t(d.langue, 'l’autre membre de votre couple', 'the other member of your couple') })) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] e-mail mensuel du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
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
