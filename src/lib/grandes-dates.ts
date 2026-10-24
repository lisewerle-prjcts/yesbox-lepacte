import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail } from '@/lib/mailer'
import { getProchainAnniversaire } from '@/lib/anniversaires'
import { NOCES, nomNoces } from '@/lib/noces'
import { t, type Locale } from '@/lib/i18n/locale'
import { membresDuCouple, envoyerRappel, type Membre } from '@/lib/rappels-email'
import { cleAnniversaireRencontre, modeleEmail, type ContenuEmail } from '@/lib/modeles-email/catalogue'
import { contenuModele } from '@/lib/modeles-email/serveur'
import type { Variables } from '@/lib/modeles-email/rendu'

type AdminClient = ReturnType<typeof createAdminClient>

// « Nos grandes dates » du couple (tableau de bord) : date de rencontre
// (couples.date_anniversaire) et date de mariage (couples.date_mariage).
export type TypeGrandeDate = 'rencontre' | 'mariage'

export const LIBELLES_GRANDE_DATE: Record<TypeGrandeDate, string> = {
  rencontre: 'Anniversaire de couple',
  mariage: 'Anniversaire de mariage',
}

export interface ProchaineGrandeDate {
  type: TypeGrandeDate
  // Date d'origine (AAAA-MM-JJ).
  origine: string
  // Prochain anniversaire de cette date.
  le: Date
  annees: number
  joursAvant: number
}

const JOUR = 24 * 60 * 60 * 1000
// L'équipe est prévenue un mois avant chaque anniversaire.
export const ALERTE_JOURS_AVANT = 30

export function prochainesGrandesDates(couple: { date_anniversaire: string | null; date_mariage?: string | null }): ProchaineGrandeDate[] {
  const now = new Date()
  const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dates: [TypeGrandeDate, string | null | undefined][] = [['rencontre', couple.date_anniversaire], ['mariage', couple.date_mariage]]
  const resultat: ProchaineGrandeDate[] = []
  for (const [type, origine] of dates) {
    if (!origine) continue
    const prochain = getProchainAnniversaire(origine)
    if (!prochain) continue
    resultat.push({
      type,
      origine,
      le: prochain.date,
      annees: prochain.years,
      joursAvant: Math.round((prochain.date.getTime() - aujourdhui.getTime()) / JOUR),
    })
  }
  return resultat.sort((a, b) => a.le.getTime() - b.le.getTime())
}

function echapper(texte: string) {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const formater = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Tâche planifiée quotidienne : un e-mail à l'équipe pour chaque anniversaire
// (rencontre ou mariage) qui tombe dans les 30 prochains jours, une seule
// fois par anniversaire (rappels_envoyes) ; un jour de tâche manqué est
// rattrapé le lendemain.
export async function envoyerAlertesGrandesDates(admin: AdminClient): Promise<number> {
  const destinataire = process.env.ADMIN_NOTIF_EMAIL || 'lise.yesbox@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'

  const { data: couples, error } = await admin
    .from('couples')
    .select('id, numero, nom_couple, date_anniversaire, date_mariage')
    .or('date_anniversaire.not.is.null,date_mariage.not.is.null')
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      const aVenir = prochainesGrandesDates(couple).filter(d => d.joursAvant > 0 && d.joursAvant <= ALERTE_JOURS_AVANT)
      if (!aVenir.length) continue

      const { data: membres } = await admin.from('profiles').select('prenom, email').eq('couple_id', couple.id)
      const nomMembres = (membres ?? []).map(m => m.prenom || m.email).join(' & ') || '—'

      for (const d of aVenir) {
        const anniversaire = `${d.le.getFullYear()}-${String(d.le.getMonth() + 1).padStart(2, '0')}-${String(d.le.getDate()).padStart(2, '0')}`
        const { data: reserve, error: reserveError } = await admin
          .from('rappels_envoyes')
          .upsert({ couple_id: couple.id, type: 'alerte_grande_date', cle: `${d.type}:${anniversaire}` }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
          .select('couple_id')
        if (reserveError) throw new Error(reserveError.message)
        if (!reserve?.length) continue

        const libelle = LIBELLES_GRANDE_DATE[d.type]
        const ok = await envoyerMail({
          nom: 'YES BOX Grandes dates',
          to: destinataire,
          subject: `${libelle} dans ${d.joursAvant} jours : Couple ${couple.numero} (${d.annees} an${d.annees > 1 ? 's' : ''})`,
          body: `
            <p>Une grande date approche pour un couple YES BOX.</p>
            <p><strong>Couple :</strong> ${couple.numero}${couple.nom_couple ? ` — ${echapper(couple.nom_couple)}` : ''}<br><strong>Membres :</strong> ${echapper(nomMembres)}<br><strong>${libelle} :</strong> ${formater(d.le)} (${d.annees} an${d.annees > 1 ? 's' : ''}, date d'origine : ${formater(new Date(d.origine))})</p>
            <p>L'e-mail d'anniversaire envoyé au couple doit être validé (avec un mot personnel si tu veux) : <a href="${appUrl}/admin#taches">le valider dans la vue d'ensemble</a>. Sans validation, il ne part pas.</p>
            <p><a href="${appUrl}/admin/couples">Voir les couples dans l'admin</a></p>
          `,
        })
        if (ok) envoyes++
      }
    } catch (e) {
      console.error(`[grandes-dates] couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// ---------------------------------------------------------------------------
// E-mails d'anniversaire aux couples (rappels, désactivables) :
//   - anniversaire de couple : le jour J, avec un conseil différent
//     chaque année (modèles « anniv_rencontre_1 », « anniv_rencontre_2 »…) ;
//   - anniversaire de mariage : une semaine avant, avec le nom des noces et
//     une idée de petit cadeau symbolique.
// Chaque e-mail doit d'abord être validé par l'équipe (Admin > Vue
// d'ensemble > Tâches), avec un mot personnel facultatif (table
// validations_emails) ; sans validation, il ne part pas, et un rappel est
// envoyé à l'équipe quelques jours avant. Une seule fois par anniversaire
// (rappels_envoyes, cle « email_rencontre:AAAA-MM-JJ » / « email_mariage:… »).
// ---------------------------------------------------------------------------

export const MARIAGE_JOURS_AVANT = 7
// Les tâches de validation apparaissent un mois avant l'envoi ; rappel à
// l'équipe 3 jours avant si l'e-mail n'est pas validé.
export const TACHE_JOURS_AVANT = 30
export const RAPPEL_VALIDATION_JOURS_AVANT = 3

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dureeAnnees(annees: number, locale: Locale) {
  return t(locale, `${annees} an${annees > 1 ? 's' : ''}`, `${annees} year${annees > 1 ? 's' : ''}`)
}

function dateLongue(d: Date, locale: Locale) {
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Jours avant l'envoi : le jour J pour la rencontre, une semaine avant pour
// le mariage.
function joursAvantEnvoi(d: ProchaineGrandeDate) {
  return d.type === 'mariage' ? d.joursAvant - MARIAGE_JOURS_AVANT : d.joursAvant
}

function dateEnvoi(d: ProchaineGrandeDate) {
  const envoi = new Date(d.le)
  if (d.type === 'mariage') envoi.setDate(envoi.getDate() - MARIAGE_JOURS_AVANT)
  return envoi
}

// Modèle et variables de l'e-mail pour une personne du couple.
function emailPour(d: ProchaineGrandeDate, m: Membre, membres: Membre[], mot: string): { cle: string; vars: Variables; etiquette?: string } {
  const autre = membres.find(x => x.id !== m.id)
  const commun = { prenom: m.prenom ?? '', partenaire: autre?.prenom ?? '', annees: dureeAnnees(d.annees, m.langue), date: dateLongue(d.le, m.langue), mot_personnel: mot }
  if (d.type === 'rencontre') return { cle: cleAnniversaireRencontre(d.annees), vars: commun }
  const noces = NOCES[d.annees]
  if (!noces) return { cle: 'anniv_mariage_sans_noces', vars: commun, etiquette: `${d.annees} ans de mariage` }
  return {
    cle: 'anniv_mariage',
    vars: {
      ...commun,
      matiere: m.langue === 'en' ? noces.en : noces.fr,
      noces: nomNoces(noces),
      autour_matiere: m.langue === 'en' ? noces.en : noces.autour,
      idees_cadeau: noces.idees?.[m.langue] ?? '',
    },
    etiquette: nomNoces(noces),
  }
}

// Texte modifié pour ce couple, par langue (sinon celui du modèle).
export type ContenuPerso = Partial<Record<Locale, ContenuEmail>>

interface Validation { couple_id: string; type: TypeGrandeDate; anniversaire: string; valide_le: string | null; mot: string | null; contenu?: ContenuPerso | null }

async function validations(admin: AdminClient, coupleIds: string[]): Promise<Validation[]> {
  if (!coupleIds.length) return []
  const avecContenu = await admin.from('validations_emails').select('couple_id, type, anniversaire, valide_le, mot, contenu').in('couple_id', coupleIds)
  // Colonne « contenu » pas encore créée : les validations restent lues.
  const { data, error } = avecContenu.error
    ? await admin.from('validations_emails').select('couple_id, type, anniversaire, valide_le, mot').in('couple_id', coupleIds)
    : avecContenu
  // Table absente (SQL pas encore exécuté) : rien n'est validé, rien ne part.
  if (error) { console.error(`[grandes-dates] validations : ${error.message}`); return [] }
  return (data ?? []) as Validation[]
}

async function couplesAvecDates(admin: AdminClient) {
  const { data, error } = await admin
    .from('couples')
    .select('id, numero, nom_couple, date_anniversaire, date_mariage')
    .is('compte_resilie_le', null)
    .or('date_anniversaire.not.is.null,date_mariage.not.is.null')
  if (error) throw new Error(error.message)
  return data ?? []
}

// ---- Tâches de validation (Admin > Vue d'ensemble) -----------------------

export interface DestinataireTache {
  prenom: string
  email: string | null
  langue: Locale
  /** A désactivé les rappels : ne recevra pas l'e-mail. */
  exclu: boolean
  cle: string
  /** Texte du modèle (sans modification pour ce couple). */
  contenu: ContenuEmail
  facultatives: string[]
  vars: Variables
}

export interface TacheEmailAnniversaire {
  coupleId: string
  numero: number
  nomCouple: string
  type: TypeGrandeDate
  anniversaire: string
  annees: number
  envoiLe: string
  joursAvantEnvoi: number
  valideLe: string | null
  mot: string
  /** Texte modifié pour ce couple (par langue). */
  contenuPerso: ContenuPerso
  destinataires: DestinataireTache[]
}

export async function tachesEmailsAnniversaire(admin: AdminClient): Promise<{ taches: TacheEmailAnniversaire[]; tableManquante: boolean }> {
  const couples = await couplesAvecDates(admin)
  const aVenir = couples.flatMap(c => prochainesGrandesDates(c)
    .filter(d => joursAvantEnvoi(d) >= 0 && joursAvantEnvoi(d) <= TACHE_JOURS_AVANT)
    .map(d => ({ couple: c, d })))
  if (!aVenir.length) return { taches: [], tableManquante: false }

  const ids = [...new Set(aVenir.map(x => x.couple.id))]
  const { error: erreurTable } = await admin.from('validations_emails').select('couple_id').limit(1)
  const [vals, { data: envois }] = await Promise.all([
    validations(admin, ids),
    admin.from('rappels_envoyes').select('couple_id, cle').eq('type', 'alerte_grande_date').in('couple_id', ids).like('cle', 'email_%'),
  ])

  const taches: TacheEmailAnniversaire[] = []
  for (const { couple, d } of aVenir) {
    const anniversaire = iso(d.le)
    // Déjà parti : plus rien à faire.
    if ((envois ?? []).some(e => e.couple_id === couple.id && e.cle === `email_${d.type}:${anniversaire}`)) continue
    const v = vals.find(x => x.couple_id === couple.id && x.type === d.type && x.anniversaire === anniversaire)
    const membres = await membresDuCouple(admin, couple.id)
    const mot = v?.mot ?? ''
    const destinataires: DestinataireTache[] = []
    for (const m of membres) {
      const { cle, vars } = emailPour(d, m, membres, mot)
      destinataires.push({
        prenom: m.prenom || m.email || '—',
        email: m.email,
        langue: m.langue,
        exclu: !m.rappels_email || !m.email,
        cle,
        contenu: await contenuModele(cle, m.langue),
        facultatives: modeleEmail(cle).facultatives ?? [],
        vars,
      })
    }
    taches.push({
      coupleId: couple.id,
      numero: couple.numero,
      nomCouple: couple.nom_couple || membres.map(m => m.prenom || m.email).join(' & '),
      type: d.type,
      anniversaire,
      annees: d.annees,
      envoiLe: iso(dateEnvoi(d)),
      joursAvantEnvoi: joursAvantEnvoi(d),
      valideLe: v?.valide_le ?? null,
      mot,
      contenuPerso: v?.contenu ?? {},
      destinataires,
    })
  }
  taches.sort((a, b) => a.joursAvantEnvoi - b.joursAvantEnvoi)
  return { taches, tableManquante: !!erreurTable }
}

// ---- Envoi (tâche planifiée quotidienne) ----------------------------------

// Appelée chaque matin, et tout de suite quand l'équipe valide un e-mail
// dont l'envoi est prévu le jour même (`coupleId`).
export async function envoyerEmailsAnniversaires(admin: AdminClient, coupleId?: string): Promise<number> {
  const couples = (await couplesAvecDates(admin)).filter(c => !coupleId || c.id === coupleId)
  const aEnvoyer = couples.flatMap(c => prochainesGrandesDates(c).filter(d => joursAvantEnvoi(d) === 0).map(d => ({ couple: c, d })))
  if (!aEnvoyer.length) return 0
  const vals = await validations(admin, [...new Set(aEnvoyer.map(x => x.couple.id))])

  let envoyes = 0
  for (const { couple, d } of aEnvoyer) {
    try {
      const anniversaire = iso(d.le)
      const v = vals.find(x => x.couple_id === couple.id && x.type === d.type && x.anniversaire === anniversaire)
      if (!v?.valide_le) continue

      const membres = await membresDuCouple(admin, couple.id)
      if (!membres.some(m => m.rappels_email && m.email)) continue

      const { data: reserve, error: reserveError } = await admin
        .from('rappels_envoyes')
        .upsert({ couple_id: couple.id, type: 'alerte_grande_date', cle: `email_${d.type}:${anniversaire}` }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
        .select('couple_id')
      if (reserveError) throw new Error(reserveError.message)
      if (!reserve?.length) continue

      for (const m of membres) {
        const { cle, vars, etiquette } = emailPour(d, m, membres, v.mot ?? '')
        if (await envoyerRappel(m, cle, vars, etiquette, v.contenu?.[m.langue])) envoyes++
      }
    } catch (e) {
      console.error(`[grandes-dates] e-mail d'anniversaire du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

// Rappel à l'équipe quand un e-mail d'anniversaire n'est toujours pas
// validé 3 jours avant son envoi (puis la veille et le jour même s'il ne
// l'est toujours pas : le rappel ne part qu'une fois par palier).
export async function envoyerRappelsValidation(admin: AdminClient): Promise<number> {
  const destinataire = process.env.ADMIN_NOTIF_EMAIL || 'lise.yesbox@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
  const couples = await couplesAvecDates(admin)
  const aValider = couples.flatMap(c => prochainesGrandesDates(c)
    .filter(d => joursAvantEnvoi(d) >= 0 && joursAvantEnvoi(d) <= RAPPEL_VALIDATION_JOURS_AVANT)
    .map(d => ({ couple: c, d })))
  if (!aValider.length) return 0
  const vals = await validations(admin, [...new Set(aValider.map(x => x.couple.id))])

  let envoyes = 0
  for (const { couple, d } of aValider) {
    try {
      const anniversaire = iso(d.le)
      if (vals.some(x => x.couple_id === couple.id && x.type === d.type && x.anniversaire === anniversaire && x.valide_le)) continue
      const jours = joursAvantEnvoi(d)
      // Paliers : 3 jours avant, la veille, le jour même.
      const palier = jours === 0 ? 0 : jours === 1 ? 1 : RAPPEL_VALIDATION_JOURS_AVANT
      const { data: reserve, error: reserveError } = await admin
        .from('rappels_envoyes')
        .upsert({ couple_id: couple.id, type: 'alerte_grande_date', cle: `rappel_validation_${d.type}:${anniversaire}:${palier}` }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
        .select('couple_id')
      if (reserveError) throw new Error(reserveError.message)
      if (!reserve?.length) continue

      const libelle = LIBELLES_GRANDE_DATE[d.type]
      const quand = jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `le ${formater(dateEnvoi(d))} (dans ${jours} jours)`
      const ok = await envoyerMail({
        nom: 'YES BOX Tâches',
        to: destinataire,
        subject: `À valider : e-mail ${d.type === 'mariage' ? "d'anniversaire de mariage" : "d'anniversaire de couple"} du Couple ${couple.numero}, envoi ${jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`}`,
        body: `
          <p>L'e-mail d'anniversaire de ce couple n'est pas encore validé. Sans validation, il ne partira pas.</p>
          <p><strong>Couple :</strong> ${couple.numero}${couple.nom_couple ? ` — ${echapper(couple.nom_couple)}` : ''}<br><strong>${libelle} :</strong> ${formater(d.le)} (${d.annees} an${d.annees > 1 ? 's' : ''})<br><strong>Envoi prévu :</strong> ${quand}</p>
          ${jours === 0 ? "<p>C'est aujourd'hui : dès que tu le valides, il part tout de suite.</p>" : '<p>Une fois validé, il partira automatiquement à la date prévue.</p>'}
          <p><a href="${appUrl}/admin#taches">Valider l'e-mail dans la vue d'ensemble</a></p>
        `,
      })
      if (ok) envoyes++
    } catch (e) {
      console.error(`[grandes-dates] rappel de validation du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}
