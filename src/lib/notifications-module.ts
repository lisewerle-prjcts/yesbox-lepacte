import { createAdminClient } from '@/lib/supabase/server'
import { mailConfigure } from '@/lib/mailer'
import { envoyerModele } from '@/lib/modeles-email/serveur'
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
  // Pacte signé : date de la bascule programmée vers l'abonnement annuel.
  basculeAnnuelleLe?: string
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
}

function formaterDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

// Modèle (cf. src/lib/modeles-email/catalogue.ts) et lien du bouton.
function modele(type: TypeNotification, slugBrut: string, dernierModule: boolean): { cle: string; chemin: string } {
  const slug = encodeURIComponent(slugBrut)
  const pacte = slugBrut === MODULE_PACTE
  switch (type) {
    case 'reponses_a_ton_tour': return { cle: 'module_reponses_a_ton_tour', chemin: `/module/${slug}` }
    case 'reponses_partagees': return { cle: 'module_reponses_partagees', chemin: `/module/${slug}/revelation` }
    case 'journal_a_ton_tour': return { cle: pacte ? 'pacte_a_ton_tour' : 'module_conclusion_a_ton_tour', chemin: `/module/${slug}/revelation` }
    case 'journal_complet':
      if (pacte) return { cle: 'pacte_signe', chemin: '/tableau-de-bord' }
      return { cle: dernierModule ? 'module_scelle_dernier' : 'module_scelle', chemin: '/tableau-de-bord' }
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
    const { cle, chemin } = modele(type, ctx.moduleSlug, !!ctx.dernierModule)
    await envoyerModele({
      to: destinataire.email,
      cle,
      locale,
      vars: {
        prenom: destinataire.prenom || '',
        partenaire: auteur.prenom || t(locale, 'Ton binôme', 'Your partner'),
        module: titre,
        lien: `${appUrl()}${chemin}`,
        lien_avis: `${appUrl()}/avis`,
        phrase_abonnement: ctx.basculeAnnuelleLe
          ? t(locale, `À la fin de votre mois d'abonnement, le ${formaterDate(ctx.basculeAnnuelleLe, locale)}, vous passerez automatiquement à l'abonnement annuel (19 €/an, résiliable à tout moment depuis Mon compte).`, `At the end of your month of subscription, on ${formaterDate(ctx.basculeAnnuelleLe, locale)}, you'll automatically switch to the yearly subscription (€19/year, cancel anytime from My Account).`)
          : '',
      },
    })
  } catch (e) {
    console.error(`[notifications] ${type} : ${e instanceof Error ? e.message : String(e)}`)
  }
}
