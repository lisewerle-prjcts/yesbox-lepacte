import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail, mailConfigure } from '@/lib/mailer'
import { t, type Locale } from '@/lib/i18n/locale'
import { MODULE_PACTE } from '@/lib/progression'
import { langueDuProfil } from '@/lib/i18n/langue-profil'

// E-mails envoyés à l'autre membre du couple à chaque étape d'un module :
//   - reponses_a_ton_tour : l'un·e a fini de répondre, l'autre pas encore ;
//   - reponses_partagees  : les deux ont répondu, place au débrief ;
//   - journal_a_ton_tour  : l'un·e a écrit sa conclusion, l'autre pas encore ;
//   - journal_complet     : les deux conclusions sont écrites, module scellé.
// Chaque notification n'est envoyée qu'une fois par personne et par module
// (table notifications_module, cf. supabase/schema.sql).

export type TypeNotification = 'reponses_a_ton_tour' | 'reponses_partagees' | 'journal_a_ton_tour' | 'journal_complet'

interface Contexte {
  moduleId: string
  moduleSlug: string
  moduleTitre: string
  /** Titre anglais, pour les personnes qui ont choisi l'anglais. */
  moduleTitreEn?: string
  coupleId: string
  // Personne qui vient d'agir ; l'e-mail part chez l'autre.
  auteurId: string
  // journal_complet : le module scellé était le dernier.
  dernierModule?: boolean
}

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

function bouton(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#c5256e;color:white;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">${label}</a></p>`
}

// Prénoms et titre arrivent bruts : échappés dans le corps HTML (un prénom
// est saisi librement), laissés tels quels dans l'objet (texte brut).
function contenu(type: TypeNotification, auteurBrut: string, destinataireBrut: string, titreBrut: string, slugBrut: string, dernierModule: boolean, locale: Locale) {
  const base = appUrl()
  const slug = encodeURIComponent(slugBrut)
  const auteur = echapperHtml(auteurBrut)
  const module = locale === 'en' ? `"${echapperHtml(titreBrut)}"` : `« ${echapperHtml(titreBrut)} »`
  const moduleBrut = locale === 'en' ? `"${titreBrut}"` : `« ${titreBrut} »`
  const bonjour = `<p style="margin:0 0 12px;">${t(locale, 'Bonjour', 'Hello')}${destinataireBrut ? ` ${echapperHtml(destinataireBrut)}` : ''},</p>`
  const p = (texte: string) => `<p style="margin:0 0 12px;">${texte}</p>`

  switch (type) {
    case 'reponses_a_ton_tour':
      return {
        subject: t(locale, `${auteurBrut} a terminé le module ${moduleBrut} — à ton tour !`, `${auteurBrut} finished the ${moduleBrut} module — your turn!`),
        body: bonjour
          + p(t(locale, `${auteur} vient de répondre à toutes les questions du module ${module}.`, `${auteur} just answered every question in the ${module} module.`))
          + p(t(locale, `À ton tour ! Ses réponses restent cachées tant que tu n'as pas répondu : vous les découvrirez ensemble.`, `Your turn! Their answers stay hidden until you've answered: you'll discover them together.`))
          + bouton(`${base}/module/${slug}`, t(locale, 'Répondre aux questions', 'Answer the questions')),
      }
    case 'reponses_partagees':
      return {
        subject: t(locale, `Module ${moduleBrut} : vos réponses sont prêtes`, `${moduleBrut} module: your answers are ready`),
        body: bonjour
          + p(t(locale, `${auteur} vient de terminer à son tour le module ${module}. Vous avez chacun·e répondu à toutes les questions.`, `${auteur} just finished the ${module} module too. You have both answered every question.`))
          + p(t(locale, `C'est le moment de débriefer ensemble et de découvrir vos réponses respectives.`, `It's time to talk it over together and discover each other's answers.`))
          + bouton(`${base}/module/${slug}/revelation`, t(locale, 'Découvrir nos réponses', 'Discover our answers')),
      }
    case 'journal_a_ton_tour':
      if (slugBrut === MODULE_PACTE) {
        return {
          subject: t(locale, `${auteurBrut} a signé votre pacte`, `${auteurBrut} signed your pact`),
          body: bonjour
            + p(t(locale, `${auteur} vient de signer votre pacte de couple.`, `${auteur} just signed your couple's pact.`))
            + p(t(locale, `À ton tour de le signer : le programme sera terminé dès que vos deux signatures seront posées.`, `Your turn to sign it: the program will be complete as soon as you have both signed.`))
            + bouton(`${base}/module/${slug}/revelation`, t(locale, 'Signer notre pacte', 'Sign our pact')),
        }
      }
      return {
        subject: t(locale, `${auteurBrut} a écrit sa conclusion du module ${moduleBrut}`, `${auteurBrut} wrote their conclusion for the ${moduleBrut} module`),
        body: bonjour
          + p(t(locale, `${auteur} vient d'inscrire sa conclusion du module ${module} dans votre journal.`, `${auteur} just added their conclusion for the ${module} module to your journal.`))
          + p(t(locale, `À ton tour d'écrire la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.`, `Your turn to write yours: the next module will unlock as soon as both your conclusions are in the journal.`))
          + bouton(`${base}/module/${slug}/revelation`, t(locale, 'Écrire ma conclusion', 'Write my conclusion')),
      }
    case 'journal_complet':
      if (slugBrut === MODULE_PACTE) {
        return {
          subject: t(locale, 'Votre pacte est signé', 'Your pact is signed'),
          body: bonjour
            + p(t(locale, `${auteur} vient de signer à son tour : votre pacte de couple porte vos deux signatures.`, `${auteur} just signed too: your couple's pact now bears both your signatures.`))
            + p(t(locale, `Bravo pour tout ce chemin parcouru ensemble ! Retrouvez la date de votre rendez-vous annuel sur votre tableau de bord.`, `Congratulations on everything you've been through together! You'll find the date of your yearly date on your dashboard.`))
            + bouton(`${base}/tableau-de-bord`, t(locale, 'Voir notre tableau de bord', 'See our dashboard')),
        }
      }
      return {
        subject: dernierModule
          ? t(locale, `Module ${moduleBrut} scellé`, `${moduleBrut} module sealed`)
          : t(locale, `Module ${moduleBrut} scellé — le suivant vous attend`, `${moduleBrut} module sealed — the next one awaits`),
        body: bonjour
          + p(t(locale, `${auteur} vient d'écrire sa conclusion : vos deux conclusions du module ${module} sont dans le journal.`, `${auteur} just wrote their conclusion: both your conclusions for the ${module} module are in the journal.`))
          + p(dernierModule
            ? t(locale, `C'était le dernier module : bravo pour tout ce chemin parcouru ensemble !`, `That was the last module: congratulations on everything you've been through together!`)
            : t(locale, `Le module suivant est débloqué, vous pouvez passer à la suite.`, `The next module is unlocked, you can move on.`))
          + bouton(`${base}/tableau-de-bord`, dernierModule ? t(locale, 'Voir notre tableau de bord', 'See our dashboard') : t(locale, 'Passer au module suivant', 'Go to the next module')),
      }
  }
}

// N'échoue jamais : une notification manquée ne doit pas bloquer la
// personne qui vient d'enregistrer ses réponses ou sa conclusion.
export async function notifierPartenaire(type: TypeNotification, ctx: Contexte): Promise<void> {
  try {
    if (!mailConfigure()) return
    const admin = createAdminClient()
    const { data: membres } = await admin.from('profiles').select('id, prenom, email').eq('couple_id', ctx.coupleId)
    const auteur = (membres ?? []).find(m => m.id === ctx.auteurId)
    const destinataire = (membres ?? []).find(m => m.id !== ctx.auteurId)
    if (!auteur || !destinataire?.email) return

    // Réserve l'envoi avant de le faire : jamais deux fois le même e-mail
    // (ex. conclusion modifiée puis réenregistrée).
    const { data: reserve, error } = await admin
      .from('notifications_module')
      .upsert({ module_id: ctx.moduleId, destinataire_id: destinataire.id, type }, { onConflict: 'module_id,destinataire_id,type', ignoreDuplicates: true })
      .select('module_id')
    if (error) { console.error(`[notifications] ${type} non envoyée : ${error.message}`); return }
    if (!reserve?.length) return

    const locale = await langueDuProfil(admin, destinataire.id)
    const titre = locale === 'en' ? ctx.moduleTitreEn ?? ctx.moduleTitre : ctx.moduleTitre
    const { subject, body } = contenu(type, auteur.prenom || t(locale, 'Ton binôme', 'Your partner'), destinataire.prenom || '', titre, ctx.moduleSlug, !!ctx.dernierModule, locale)
    await envoyerMail({ to: destinataire.email, subject: subject.replace(/[\r\n]+/g, ' '), body })
  } catch (e) {
    console.error(`[notifications] ${type} : ${e instanceof Error ? e.message : String(e)}`)
  }
}
