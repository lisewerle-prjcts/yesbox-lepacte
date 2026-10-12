import { createHmac, timingSafeEqual } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail, mailConfigure } from '@/lib/mailer'
import { getEffectiveModules } from '@/lib/modules-effective'
import { hasAnsweredAll } from '@/lib/questions'
import { aAccesComplet, peutAccederModule } from '@/lib/abonnement'
import { MODULE_RDV_ANNUEL } from '@/lib/progression'
import { ABONNEMENT_COLONNES } from '@/types'
import type { CoupleAbonnement } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

// E-mails de rappel envoyés par la tâche planifiée quotidienne
// /api/cron/rappels-email :
//   1. relance quand un couple n'a pas avancé dans son parcours depuis
//      10 jours (puis une seconde à 20 jours, pas plus) ;
//   2. une fois le pacte signé, un e-mail par mois pour faire vivre les
//      engagements, et l'annonce du rendez-vous annuel un mois avant.
// Uniquement pour les couples dont l'accès est en cours (les relances après
// résiliation viendront plus tard). Chaque membre peut refuser ces rappels
// (profiles.rappels_email) : lien en bas de chaque e-mail ou Mon compte.

const JOUR = 24 * 60 * 60 * 1000
const RELANCES_APRES_JOURS = [10, 20]

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
}

function echapperHtml(texte: string) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const p = (texte: string) => `<p style="margin:0 0 12px;">${texte}</p>`

function bouton(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#c5256e;color:white;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">${label}</a></p>`
}

function formaterDate(date: string) {
  // Date AAAA-MM-JJ lue en UTC pour éviter un décalage d'un jour.
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// ---------------------------------------------------------------------------
// Lien de désinscription : signé, pour fonctionner sans être connecté·e.
// ---------------------------------------------------------------------------

function secretRappels() {
  return process.env.RAPPELS_SECRET || process.env.CRON_SECRET || ''
}

export function signatureDesinscription(userId: string) {
  return createHmac('sha256', secretRappels()).update(`rappels:${userId}`).digest('hex').slice(0, 32)
}

export function verifierSignatureDesinscription(userId: string, signature: string) {
  if (!secretRappels() || !userId || !signature) return false
  const attendue = Buffer.from(signatureDesinscription(userId))
  const recue = Buffer.from(signature)
  return attendue.length === recue.length && timingSafeEqual(attendue, recue)
}

function piedDePage(userId: string) {
  const lien = `${appUrl()}/desinscription?u=${encodeURIComponent(userId)}&s=${signatureDesinscription(userId)}`
  return `<p style="margin:24px 0 0;font-size:12px;color:#8a8580;">Tu reçois ce rappel parce que votre couple suit le parcours YES BOX. <a href="${lien}" style="color:#8a8580;">Ne plus recevoir ces rappels</a></p>`
}

interface Membre { id: string; prenom: string | null; email: string | null; rappels_email: boolean }

async function membresDuCouple(admin: AdminClient, coupleId: string): Promise<Membre[]> {
  const { data, error } = await admin.from('profiles').select('id, prenom, email, rappels_email').eq('couple_id', coupleId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Membre[]
}

async function envoyer(destinataire: Membre, subject: string, corps: string): Promise<boolean> {
  if (!destinataire.email || !destinataire.rappels_email) return false
  const bonjour = p(`Bonjour${destinataire.prenom ? ` ${echapperHtml(destinataire.prenom)}` : ''},`)
  return envoyerMail({
    to: destinataire.email,
    subject: subject.replace(/[\r\n]+/g, ' '),
    body: bonjour + corps + p('L’équipe YES BOX') + piedDePage(destinataire.id),
  })
}

// ---------------------------------------------------------------------------
// 1. Relance après 10 jours sans avancer
// ---------------------------------------------------------------------------

type EtapeRelance =
  | { type: 'reponses_a_ton_tour'; attendu: Membre; autre: Membre }
  | { type: 'conclusion_a_ton_tour'; attendu: Membre; autre: Membre }
  | { type: 'a_vous_deux'; debrief: boolean }

function contenuRelance(etape: EtapeRelance, destinataire: Membre, titreBrut: string, numero: number, total: number, href: string) {
  const module = `« ${echapperHtml(titreBrut)} »`
  if (etape.type === 'reponses_a_ton_tour' || etape.type === 'conclusion_a_ton_tour') {
    const autreBrut = etape.autre.prenom || 'L’autre membre de votre couple'
    const autre = echapperHtml(autreBrut)
    if (etape.type === 'reponses_a_ton_tour') {
      return {
        subject: `${autreBrut} t'attend dans « ${titreBrut} »`,
        corps: p(`Votre parcours YES BOX est en pause depuis quelques jours. ${autre} a terminé ses réponses au module ${module} et attend les tiennes pour que vous puissiez les découvrir ensemble.`)
          + p('Pas besoin d’y passer des heures : un moment au calme suffit. Tes réponses restent cachées jusqu’à ce que vous ayez terminé de part et d’autre.')
          + bouton(href, 'Reprendre le module'),
      }
    }
    return {
      subject: `${autreBrut} t'attend dans « ${titreBrut} »`,
      corps: p(`Votre parcours YES BOX est en pause depuis quelques jours. ${autre} a écrit sa conclusion du module ${module} et attend la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.`)
        + p('Quelques lignes suffisent : ce que tu as appris, ce qui t’a surpris.')
        + bouton(href, 'Écrire ma conclusion'),
    }
  }
  return {
    subject: `Votre parcours vous attend : « ${titreBrut} »`,
    corps: p('Cela fait quelques jours que votre parcours YES BOX n’a pas avancé. Rien de grave : la vie va vite. Mais c’est justement pour ça que ces moments à deux comptent.')
      + p(`Votre prochaine étape : ${etape.debrief ? 'découvrir vos réponses et écrire vos conclusions du' : 'le'} module <strong>${module}</strong> (${numero}/${total}).`)
      + p(etape.debrief
        ? 'Une idée : choisissez dès maintenant un moment dans la semaine pour découvrir vos réponses ensemble.'
        : 'Une idée : choisissez dès maintenant un créneau dans la semaine pour y répondre séparément, puis un autre pour découvrir vos réponses ensemble.')
      + bouton(href, 'Reprendre notre parcours'),
  }
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
        const fini = (m: Membre) => hasAnsweredAll(info.questions, (reponses ?? []).filter(r => r.user_id === m.id))
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
        const conclusionFaite = (m: Membre) => ['apprentissage', 'surprise'].every(q =>
          (conclusions ?? []).some(c => c.user_id === m.id && c.question_slug === q && c.valeur?.trim())
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
        const { subject, corps } = contenuRelance(etape, d, info.titre, index + 1, modulesParcours.length, href)
        if (await envoyer(d, subject, corps)) envoyes++
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

interface ThemeMensuel { subject: string; paragraphes: (autre: string) => string[] }

// Un thème par mois, dans l'ordre, à partir du 1er mois après la signature ;
// on reboucle ensuite (à partir du 2e) après le rendez-vous annuel.
const THEMES: ThemeMensuel[] = [
  {
    subject: 'Un mois que vous avez signé votre pacte 💍',
    paragraphes: autre => [
      `Il y a un mois, ${autre} et toi avez signé votre pacte. Bravo : beaucoup de couples n’osent jamais mettre des mots sur ce qui compte vraiment à deux.`,
      'Le pacte vit surtout dans les petits gestes du quotidien. Ce mois-ci, une seule question à vous poser à deux :',
      '<strong>« Quel engagement de notre pacte avons-nous le mieux tenu ce mois-ci ? »</strong>',
    ],
  },
  {
    subject: 'Et si vous vous disiez merci ?',
    paragraphes: autre => [
      `Dans votre pacte, vous avez parlé de gratitude. Ce mois-ci, petit défi : dis à ${autre} une chose précise que tu as appréciée cette semaine. Pas un « merci pour tout », un vrai détail.`,
      'Ça prend 30 secondes, et c’est souvent ce qu’on oublie le plus vite.',
    ],
  },
  {
    subject: 'Votre socle tient-il bon ?',
    paragraphes: () => [
      'Au moment d’écrire votre pacte, vous avez choisi les 3 principes de base d’un couple heureux… et du vôtre en particulier.',
      'Ce mois-ci, relisez-les ensemble : <strong>lequel avez-vous le plus vécu ces dernières semaines ? Lequel aimeriez-vous soigner davantage ?</strong>',
    ],
  },
  {
    subject: 'Un moment rien qu’à vous',
    paragraphes: () => [
      'Le quotidien a vite fait de reprendre toute la place. Ce mois-ci, un défi simple : <strong>bloquez une soirée sans écran, rien que tous les deux</strong>.',
      'Pas besoin d’un grand programme : un repas, une balade, une conversation sans téléphone à portée de main.',
    ],
  },
  {
    subject: 'Le désaccord du mois',
    paragraphes: () => [
      'En écrivant votre pacte, vous avez classé vos désaccords : négociable, pas encore réfléchi, rédhibitoire.',
      'Ce mois-ci, choisissez <strong>un désaccord « négociable »</strong> et prenez un moment calme pour en reparler. L’objectif n’est pas de gagner, mais de comprendre ce qui compte pour l’autre.',
    ],
  },
  {
    subject: 'Mi-parcours de votre année',
    paragraphes: () => [
      'Votre pacte a déjà plusieurs mois. C’est le bon moment pour le relire ensemble.',
      '<strong>Y a-t-il un engagement à ajuster, à préciser, ou un nouveau à ajouter ?</strong> Un pacte vivant, c’est un pacte qui évolue avec vous.',
    ],
  },
  {
    subject: 'Le geste qui vous rapproche',
    paragraphes: () => [
      'Vous vous êtes choisi un geste ou un code de rapprochement. Ce mois-ci, faites-le vivre : <strong>utilisez-le au moins une fois par semaine</strong>.',
      'Ce sont ces petits signes qui entretiennent la complicité au quotidien.',
    ],
  },
  {
    subject: 'Qu’est-ce qui a changé entre vous ?',
    paragraphes: () => [
      'Depuis le début de votre parcours, des choses ont bougé, même discrètement.',
      'Ce mois-ci, prenez un moment pour vous le dire : <strong>qu’est-ce qui va mieux entre vous ? Qu’est-ce que vous voulez garder précieusement ?</strong>',
    ],
  },
  {
    subject: 'Vos rêves à deux',
    paragraphes: () => [
      'Un voyage, un projet, une envie dont vous parlez depuis longtemps ?',
      'Ce mois-ci, choisissez <strong>un projet commun et faites-le avancer d’un pas</strong> : une date, une réservation, un premier rendez-vous.',
    ],
  },
  {
    subject: 'Prendre soin de soi pour prendre soin du couple',
    paragraphes: () => [
      'Un couple solide, c’est aussi deux personnes qui vont bien.',
      'Ce mois-ci, posez-vous la question séparément, puis partagez vos réponses : <strong>de quoi ai-je besoin en ce moment ? Qu’est-ce que l’autre pourrait faire pour m’aider ?</strong>',
    ],
  },
  {
    subject: 'La gratitude, encore',
    paragraphes: autre => [
      `Ce mois-ci, un petit geste : écris un mot à ${autre}. Quelques lignes sur un papier, un message, peu importe.`,
      'Dis-lui ce que tu apprécies le plus en ce moment dans votre relation. C’est simple, et ça marque longtemps.',
    ],
  },
]

// Nombre de mois entiers écoulés depuis la signature (même jour du mois).
function moisDepuis(debut: Date, maintenant: Date) {
  let mois = (maintenant.getUTCFullYear() - debut.getUTCFullYear()) * 12 + (maintenant.getUTCMonth() - debut.getUTCMonth())
  if (maintenant.getUTCDate() < debut.getUTCDate()) mois--
  return mois
}

function contenuMensuel(mois: number, autreBrut: string, rdvLe: string | null, joursAvantRdv: number | null) {
  const autre = echapperHtml(autreBrut)
  const base = appUrl()
  if (rdvLe && joursAvantRdv !== null && joursAvantRdv > 0 && joursAvantRdv <= 31) {
    const date = formaterDate(rdvLe)
    return {
      subject: `Votre rendez-vous annuel approche : le ${date}`,
      corps: p(`Dans ${joursAvantRdv} jour${joursAvantRdv > 1 ? 's' : ''}, c’est votre rendez-vous annuel. Le module « Notre rendez-vous annuel » s’ouvrira le ${date} : vous y regarderez ensemble votre année, ce qui a marché, ce qui a été dur, ce que vous voulez pour la suite.`)
        + p('Vous aviez choisi ensemble qui l’organise : c’est peut-être le moment de réserver le lieu ou de bloquer la soirée !')
        + bouton(`${base}/journal`, 'Voir notre pacte'),
    }
  }
  const theme = THEMES[mois <= THEMES.length ? mois - 1 : 1 + ((mois - 2) % (THEMES.length - 1))]
  const rappelRdv = rdvLe && joursAvantRdv !== null && joursAvantRdv > 0
    ? p(`<span style="font-size:13px;color:#8a8580;">Prochain rendez-vous annuel : le ${formaterDate(rdvLe)}.</span>`)
    : ''
  return {
    subject: theme.subject,
    corps: theme.paragraphes(autre).map(p).join('') + bouton(`${base}/journal`, 'Relire notre pacte') + rappelRdv,
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
        const { subject, corps } = contenuMensuel(mois, autre?.prenom || 'l’autre membre de votre couple', rdvLe, joursAvantRdv)
        if (await envoyer(d, subject, corps)) envoyes++
      }
    } catch (e) {
      console.error(`[rappels] e-mail mensuel du couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}

export function rappelsConfigures() {
  return mailConfigure()
}
