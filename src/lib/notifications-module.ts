import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail, mailConfigure } from '@/lib/mailer'

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
function contenu(type: TypeNotification, auteurBrut: string, destinataireBrut: string, titreBrut: string, slugBrut: string, dernierModule: boolean) {
  const base = appUrl()
  const slug = encodeURIComponent(slugBrut)
  const auteur = echapperHtml(auteurBrut)
  const module = `« ${echapperHtml(titreBrut)} »`
  const bonjour = `<p style="margin:0 0 12px;">Bonjour${destinataireBrut ? ` ${echapperHtml(destinataireBrut)}` : ''},</p>`
  const p = (texte: string) => `<p style="margin:0 0 12px;">${texte}</p>`

  switch (type) {
    case 'reponses_a_ton_tour':
      return {
        subject: `${auteurBrut} a terminé le module « ${titreBrut} » — à ton tour !`,
        body: bonjour
          + p(`${auteur} vient de répondre à toutes les questions du module ${module}.`)
          + p(`À ton tour ! Ses réponses restent cachées tant que tu n'as pas répondu : vous les découvrirez ensemble.`)
          + bouton(`${base}/module/${slug}`, 'Répondre aux questions'),
      }
    case 'reponses_partagees':
      return {
        subject: `Module « ${titreBrut} » : vos réponses sont prêtes`,
        body: bonjour
          + p(`${auteur} vient de terminer à son tour le module ${module}. Vous avez chacun·e répondu à toutes les questions.`)
          + p(`C'est le moment de débriefer ensemble et de découvrir vos réponses respectives.`)
          + bouton(`${base}/module/${slug}/revelation`, 'Découvrir nos réponses'),
      }
    case 'journal_a_ton_tour':
      return {
        subject: `${auteurBrut} a écrit sa conclusion du module « ${titreBrut} »`,
        body: bonjour
          + p(`${auteur} vient d'inscrire sa conclusion du module ${module} dans votre journal.`)
          + p(`À ton tour d'écrire la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.`)
          + bouton(`${base}/module/${slug}/revelation`, 'Écrire ma conclusion'),
      }
    case 'journal_complet':
      return {
        subject: `Module « ${titreBrut} » scellé${dernierModule ? '' : ' — le suivant vous attend'}`,
        body: bonjour
          + p(`${auteur} vient d'écrire sa conclusion : vos deux conclusions du module ${module} sont dans le journal.`)
          + p(dernierModule
            ? `C'était le dernier module : bravo pour tout ce chemin parcouru ensemble !`
            : `Le module suivant est débloqué, vous pouvez passer à la suite.`)
          + bouton(`${base}/tableau-de-bord`, dernierModule ? 'Voir notre tableau de bord' : 'Passer au module suivant'),
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

    const { subject, body } = contenu(type, auteur.prenom || 'Ton binôme', destinataire.prenom || '', ctx.moduleTitre, ctx.moduleSlug, !!ctx.dernierModule)
    await envoyerMail({ to: destinataire.email, subject: subject.replace(/[\r\n]+/g, ' '), body })
  } catch (e) {
    console.error(`[notifications] ${type} : ${e instanceof Error ? e.message : String(e)}`)
  }
}
