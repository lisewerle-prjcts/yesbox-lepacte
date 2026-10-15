import { createHmac, timingSafeEqual } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail, mailConfigure } from '@/lib/mailer'
import { getEffectiveModules } from '@/lib/modules-effective'
import { hasAnsweredAll } from '@/lib/questions'
import { aAccesComplet, offreRdvAnnuel, peutAccederModule } from '@/lib/abonnement'
import { MODULE_RDV_ANNUEL, MODULE_PACTE, entreesDeFin } from '@/lib/progression'
import { ABONNEMENT_COLONNES } from '@/types'
import type { CoupleAbonnement } from '@/types'
import { t, type Locale } from '@/lib/i18n/locale'
import { languesDesProfils } from '@/lib/i18n/langue-profil'
import { dechiffrerLignes } from '@/lib/chiffrement'

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
//      depuis la page Notre Pacte).
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

function formaterDate(date: string, locale: Locale) {
  // Date AAAA-MM-JJ lue en UTC pour éviter un décalage d'un jour.
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
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

function piedDePage(userId: string, locale: Locale) {
  const lien = `${appUrl()}/desinscription?u=${encodeURIComponent(userId)}&s=${signatureDesinscription(userId)}&l=${locale}`
  return `<p style="margin:24px 0 0;font-size:12px;color:#8a8580;">${t(locale, 'Tu reçois ce rappel parce que votre couple suit le parcours YES BOX.', 'You are receiving this reminder because your couple is following the YES BOX program.')} <a href="${lien}" style="color:#8a8580;">${t(locale, 'Ne plus recevoir ces rappels', 'Stop receiving these reminders')}</a></p>`
}

interface Membre { id: string; prenom: string | null; email: string | null; rappels_email: boolean; langue: Locale }

async function membresDuCouple(admin: AdminClient, coupleId: string): Promise<Membre[]> {
  const { data, error } = await admin.from('profiles').select('id, prenom, email, rappels_email').eq('couple_id', coupleId)
  if (error) throw new Error(error.message)
  const langues = await languesDesProfils(admin, (data ?? []).map(m => m.id))
  return (data ?? []).map(m => ({ ...m, langue: langues.get(m.id) ?? 'fr' })) as Membre[]
}

async function envoyer(destinataire: Membre, subject: string, corps: string): Promise<boolean> {
  if (!destinataire.email || !destinataire.rappels_email) return false
  const locale = destinataire.langue
  const bonjour = p(`${t(locale, 'Bonjour', 'Hello')}${destinataire.prenom ? ` ${echapperHtml(destinataire.prenom)}` : ''},`)
  return envoyerMail({
    to: destinataire.email,
    subject: subject.replace(/[\r\n]+/g, ' '),
    body: bonjour + corps + p(t(locale, 'L’équipe YES BOX', 'The YES BOX team')) + piedDePage(destinataire.id, locale),
  })
}

// ---------------------------------------------------------------------------
// 1. Relance après 10 jours sans avancer
// ---------------------------------------------------------------------------

type EtapeRelance =
  | { type: 'reponses_a_ton_tour'; attendu: Membre; autre: Membre }
  | { type: 'conclusion_a_ton_tour'; attendu: Membre; autre: Membre }
  | { type: 'a_vous_deux'; debrief: boolean }

function contenuRelance(etape: EtapeRelance, locale: Locale, titreBrut: string, numero: number, total: number, href: string, pacte = false) {
  const module = locale === 'en' ? `"${echapperHtml(titreBrut)}"` : `« ${echapperHtml(titreBrut)} »`
  const moduleBrut = locale === 'en' ? `"${titreBrut}"` : `« ${titreBrut} »`
  if (etape.type === 'reponses_a_ton_tour' || etape.type === 'conclusion_a_ton_tour') {
    const autreBrut = etape.autre.prenom || t(locale, 'L’autre membre de votre couple', 'The other member of your couple')
    const autre = echapperHtml(autreBrut)
    const subject = t(locale, `${autreBrut} t'attend dans ${moduleBrut}`, `${autreBrut} is waiting for you in ${moduleBrut}`)
    if (etape.type === 'reponses_a_ton_tour') {
      return {
        subject,
        corps: p(t(locale,
          `Votre parcours YES BOX est en pause depuis quelques jours. ${autre} a terminé ses réponses au module ${module} et attend les tiennes pour que vous puissiez les découvrir ensemble.`,
          `Your YES BOX program has been on pause for a few days. ${autre} has finished their answers to the ${module} module and is waiting for yours so you can discover them together.`))
          + p(t(locale,
            'Pas besoin d’y passer des heures : un moment au calme suffit. Tes réponses restent cachées jusqu’à ce que vous ayez terminé de part et d’autre.',
            'No need to spend hours on it: a quiet moment is enough. Your answers stay hidden until you have both finished.'))
          + bouton(href, t(locale, 'Reprendre le module', 'Resume the module')),
      }
    }
    if (pacte) {
      return {
        subject,
        corps: p(t(locale,
          `Votre parcours YES BOX est en pause depuis quelques jours. ${autre} a signé votre pacte et attend ta signature pour clore le programme.`,
          `Your YES BOX program has been on pause for a few days. ${autre} has signed your pact and is waiting for your signature to complete the program.`))
          + bouton(href, t(locale, 'Signer notre pacte', 'Sign our pact')),
      }
    }
    return {
      subject,
      corps: p(t(locale,
        `Votre parcours YES BOX est en pause depuis quelques jours. ${autre} a écrit sa conclusion du module ${module} et attend la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.`,
        `Your YES BOX program has been on pause for a few days. ${autre} has written their conclusion for the ${module} module and is waiting for yours: the next module will unlock as soon as both your conclusions are in the journal.`))
        + p(t(locale, 'Quelques lignes suffisent : ce que tu as appris, ce qui t’a surpris·e.', 'A few lines are enough: what you learned, what surprised you.'))
        + bouton(href, t(locale, 'Écrire ma conclusion', 'Write my conclusion')),
    }
  }
  return {
    subject: t(locale, `Votre parcours vous attend : ${moduleBrut}`, `Your program is waiting for you: ${moduleBrut}`),
    corps: p(t(locale,
      'Cela fait quelques jours que votre parcours YES BOX n’a pas avancé. Rien de grave : la vie va vite. Mais c’est justement pour ça que ces moments à deux comptent.',
      'Your YES BOX program hasn’t moved forward for a few days. No big deal: life moves fast. But that’s exactly why these moments together matter.'))
      + p(etape.debrief
        ? (pacte
          ? t(locale, `Votre prochaine étape : découvrir vos réponses du module <strong>${module}</strong> (${numero}/${total}) et signer votre pacte.`, `Your next step: discover your answers for the <strong>${module}</strong> module (${numero}/${total}) and sign your pact.`)
          : t(locale, `Votre prochaine étape : découvrir vos réponses et écrire vos conclusions du module <strong>${module}</strong> (${numero}/${total}).`, `Your next step: discover your answers and write your conclusions for the <strong>${module}</strong> module (${numero}/${total}).`))
        : t(locale, `Votre prochaine étape : le module <strong>${module}</strong> (${numero}/${total}).`, `Your next step: the <strong>${module}</strong> module (${numero}/${total}).`))
      + p(etape.debrief
        ? t(locale, 'Une idée : choisissez dès maintenant un moment dans la semaine pour découvrir vos réponses ensemble.', 'An idea: pick a moment this week right now to discover your answers together.')
        : t(locale, 'Une idée : choisissez dès maintenant un créneau dans la semaine pour y répondre séparément, puis un autre pour découvrir vos réponses ensemble.', 'An idea: pick a slot this week right now to answer separately, then another one to discover your answers together.'))
      + bouton(href, t(locale, 'Reprendre notre parcours', 'Resume our program')),
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
        const { subject, corps } = contenuRelance(etape, d.langue, titre, index + 1, modulesParcours.length, href, info.slug === MODULE_PACTE)
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

// Mêmes thèmes, même ordre, en anglais.
const THEMES_EN: ThemeMensuel[] = [
  {
    subject: 'One month since you signed your pact 💍',
    paragraphes: autre => [
      `A month ago, ${autre} and you signed your pact. Well done: many couples never dare to put into words what truly matters to them as a pair.`,
      'Your pact lives mostly in small everyday gestures. This month, just one question to ask each other:',
      '<strong>"Which commitment in our pact did we keep best this month?"</strong>',
    ],
  },
  {
    subject: 'What if you said thank you?',
    paragraphes: autre => [
      `In your pact, you talked about gratitude. This month, a little challenge: tell ${autre} one specific thing you appreciated this week. Not a "thanks for everything", a real detail.`,
      'It takes 30 seconds, and it’s often what we forget first.',
    ],
  },
  {
    subject: 'Is your foundation holding strong?',
    paragraphes: () => [
      'When writing your pact, you chose the 3 core principles of a happy couple… and of yours in particular.',
      'This month, reread them together: <strong>which one have you lived the most these past weeks? Which one would you like to nurture more?</strong>',
    ],
  },
  {
    subject: 'A moment just for the two of you',
    paragraphes: () => [
      'Everyday life easily takes up all the space. This month, a simple challenge: <strong>set aside a screen-free evening, just the two of you</strong>.',
      'No need for big plans: a meal, a walk, a conversation with no phone within reach.',
    ],
  },
  {
    subject: 'The disagreement of the month',
    paragraphes: () => [
      'When writing your pact, you sorted your disagreements: negotiable, not yet thought through, dealbreaker.',
      'This month, pick <strong>one "negotiable" disagreement</strong> and take a calm moment to talk about it again. The goal isn’t to win, but to understand what matters to the other person.',
    ],
  },
  {
    subject: 'Halfway through your year',
    paragraphes: () => [
      'Your pact is already a few months old. It’s the right time to reread it together.',
      '<strong>Is there a commitment to adjust, clarify, or a new one to add?</strong> A living pact is one that grows with you.',
    ],
  },
  {
    subject: 'The gesture that brings you closer',
    paragraphes: () => [
      'You chose a gesture or code to reconnect. This month, bring it to life: <strong>use it at least once a week</strong>.',
      'These small signs are what keep your bond alive day to day.',
    ],
  },
  {
    subject: 'What has changed between you?',
    paragraphes: () => [
      'Since you started your program, things have shifted, even quietly.',
      'This month, take a moment to tell each other: <strong>what is going better between you? What do you want to hold on to?</strong>',
    ],
  },
  {
    subject: 'Your shared dreams',
    paragraphes: () => [
      'A trip, a project, something you’ve been talking about for a long time?',
      'This month, choose <strong>one shared project and move it forward by one step</strong>: a date, a booking, a first appointment.',
    ],
  },
  {
    subject: 'Taking care of yourself to take care of your couple',
    paragraphes: () => [
      'A strong couple is also two people who are doing well.',
      'This month, ask yourselves separately, then share your answers: <strong>what do I need right now? What could the other person do to help me?</strong>',
    ],
  },
  {
    subject: 'Gratitude, once more',
    paragraphes: autre => [
      `This month, a small gesture: write a note to ${autre}. A few lines on paper, a message, it doesn’t matter.`,
      'Tell them what you appreciate most in your relationship right now. It’s simple, and it stays with you for a long time.',
    ],
  },
]

// Nombre de mois entiers écoulés depuis la signature (même jour du mois).
function moisDepuis(debut: Date, maintenant: Date) {
  let mois = (maintenant.getUTCFullYear() - debut.getUTCFullYear()) * 12 + (maintenant.getUTCMonth() - debut.getUTCMonth())
  if (maintenant.getUTCDate() < debut.getUTCDate()) mois--
  return mois
}

function contenuMensuel(mois: number, autreBrut: string, rdvLe: string | null, joursAvantRdv: number | null, locale: Locale) {
  const autre = echapperHtml(autreBrut)
  const base = appUrl()
  if (rdvLe && joursAvantRdv !== null && joursAvantRdv > 0 && joursAvantRdv <= 31) {
    const date = formaterDate(rdvLe, locale)
    const pluriel = joursAvantRdv > 1 ? 's' : ''
    return {
      subject: t(locale, `Votre rendez-vous annuel approche : le ${date}`, `Your yearly date is coming up: ${date}`),
      corps: p(t(locale,
        `Dans ${joursAvantRdv} jour${pluriel}, c’est votre rendez-vous annuel. Le module « Notre rendez-vous annuel » s’ouvrira le ${date} : vous y regarderez ensemble votre année, ce qui a marché, ce qui a été dur, ce que vous voulez pour la suite.`,
        `In ${joursAvantRdv} day${pluriel}, it’s your yearly date. The "Our Yearly Date" module will open on ${date}: you’ll look back on your year together, what worked, what was hard, and what you want next.`))
        + p(t(locale,
          'Vous aviez choisi ensemble qui l’organise : c’est peut-être le moment de réserver le lieu ou de bloquer la soirée !',
          'You chose together who would organize it: maybe it’s time to book the place or block the evening!'))
        + bouton(`${base}/journal`, t(locale, 'Voir notre pacte', 'See our pact')),
    }
  }
  const themes = locale === 'en' ? THEMES_EN : THEMES
  const theme = themes[mois <= themes.length ? mois - 1 : 1 + ((mois - 2) % (themes.length - 1))]
  const rappelRdv = rdvLe && joursAvantRdv !== null && joursAvantRdv > 0
    ? p(`<span style="font-size:13px;color:#8a8580;">${t(locale, `Prochain rendez-vous annuel : le ${formaterDate(rdvLe, locale)}.`, `Next yearly date: ${formaterDate(rdvLe, locale)}.`)}</span>`)
    : ''
  return {
    subject: theme.subject,
    corps: theme.paragraphes(autre).map(p).join('') + bouton(`${base}/journal`, t(locale, 'Relire notre pacte', 'Reread our pact')) + rappelRdv,
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
        const { subject, corps } = contenuMensuel(mois, autre?.prenom || t(d.langue, 'l’autre membre de votre couple', 'the other member of your couple'), rdvLe, joursAvantRdv, d.langue)
        if (await envoyer(d, subject, corps)) envoyes++
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

function contenuBasculeAnnuelle(finPeriode: string, rdvLe: string | null, locale: Locale) {
  const date = formaterDate(finPeriode, locale)
  const rdv = rdvLe
    ? t(locale, `, le ${formaterDate(rdvLe, locale)}`, `, on ${formaterDate(rdvLe, locale)}`)
    : ''
  return {
    subject: t(locale, 'Continuez l’aventure avec l’abonnement annuel', 'Keep going with the yearly subscription'),
    corps: p(t(locale,
      `Votre parcours initial est terminé, bravo ! Votre mois d’abonnement en cours se termine le ${date}.`,
      `You've completed the initial program, well done! Your current month of subscription ends on ${date}.`))
      + p(t(locale,
        `Pour continuer à faire vivre votre pacte, passez à l’abonnement annuel « Pacte – notre rendez-vous annuel » : <strong>19 € par an</strong>. Vous recevrez régulièrement de petits messages pour continuer à renforcer votre couple, et le module « Notre rendez-vous annuel » s’ouvrira à la date que vous avez fixée${rdv}.`,
        `To keep your pact alive, switch to the "Pact – our yearly date" yearly subscription: <strong>€19 per year</strong>. You'll receive little messages regularly to keep strengthening your relationship, and the "Our Yearly Date" module will open on the date you set${rdv}.`))
      + p(t(locale,
        `Rien ne change d’ici là : la bascule a lieu le ${date}, et les 19 € sont prélevés ce jour-là sur la carte déjà enregistrée. Résiliable à tout moment depuis Mon compte.`,
        `Nothing changes until then: the switch happens on ${date}, and the €19 is charged that day to the card already on file. Cancel anytime from My Account.`))
      + bouton(`${appUrl()}/journal#rdv-annuel-offre`, t(locale, 'Passer à l’abonnement annuel', 'Switch to the yearly subscription')),
  }
}

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
      // Uniquement un abonnement mensuel en cours, sans bascule déjà programmée.
      const offre = offreRdvAnnuel(couple as CoupleAbonnement, {
        formule: (couple.subscription_formule as 'mensuel' | 'annuel' | null) ?? null,
        annuelPrevuLe: (couple.subscription_annuel_prevu_le as string | null) ?? null,
      }, true)
      if (!offre.afficher || !offre.mensuelEnCours) continue

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
        const { subject, corps } = contenuBasculeAnnuelle(finPeriode, rdvLe, d.langue)
        if (await envoyer(d, subject, corps)) envoyes++
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
