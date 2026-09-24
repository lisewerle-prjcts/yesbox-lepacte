import type { Metadata } from 'next'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { getLocale, getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales et politique de confidentialité de YES BOX — Le Pacte.',
  robots: { index: false, follow: false },
}

export default async function MentionsLegales() {
  const t = getT(await getLocale())
  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <Link href="/" className="btn-ghost text-sm py-2 px-4">← <EditableText id="mentions.retour">Retour</EditableText></Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="eyebrow mb-4"><EditableText id="mentions.eyebrow">Légal</EditableText></div>
        <h1 className="font-serif text-4xl font-bold mb-10" style={{ color: 'var(--ink)' }}><EditableText id="mentions.titre">Mentions légales</EditableText></h1>

        <div className="space-y-10" style={{ color: 'var(--ink-2)', lineHeight: 1.8, fontSize: 14.5 }}>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.editeur.titre">Éditeur du site</EditableText></h2>
            <p><EditableText id="mentions.editeur.texte">Le site yesbox-lepacte.fr est édité par :</EditableText></p>
            <ul className="mt-2 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>{t('Nom :', 'Name:')} YES BOX</li>
              <li>{t('Adresse e-mail :', 'Email address:')} <a href="mailto:lise.yesbox@gmail.com" style={{ color: 'var(--brand)' }}>lise.yesbox@gmail.com</a></li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.hebergement.titre">Hébergement</EditableText></h2>
            <p><EditableText id="mentions.hebergement.texte">Le site est hébergé par :</EditableText></p>
            <ul className="mt-2 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>Vercel Inc. — 340 Pine Street, Suite 700, San Francisco, CA 94104, USA</li>
              <li>Supabase Inc. ({t('base de données', 'database')}) — 970 Toa Payoh North, {t('Singapour', 'Singapore')}</li>
              <li>Stripe Payments Europe, Ltd. ({t('paiement de l’abonnement', 'subscription payment')}) — {t('Irlande', 'Ireland')}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.donnees.titre">Données personnelles</EditableText></h2>
            <p>
              <EditableText id="mentions.donnees.intro" multiline>Dans le cadre de l&apos;utilisation du site YES BOX, nous collectons uniquement les données nécessaires au fonctionnement du service :</EditableText>
            </p>
            <ul className="mt-3 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>{t('Adresse e-mail (compte utilisateur)', 'Email address (user account)')}</li>
              <li>{t('Prénom (personnalisation)', 'First name (personalization)')}</li>
              <li>{t('Réponses aux modules (stockées de façon privée, accessibles au couple uniquement)', 'Module answers (stored privately, accessible only to the couple)')}</li>
              <li>{t('Informations de pré-commande (nom, e-mail, adresse optionnelle)', 'Pre-order information (name, email, optional address)')}</li>
              <li>{t('Données d’abonnement (statut, date de renouvellement) — le paiement lui-même est traité par Stripe, qui ne nous transmet jamais votre numéro de carte', 'Subscription data (status, renewal date) — payment itself is processed by Stripe, which never shares your card number with us')}</li>
            </ul>
            <p className="mt-4">
              <EditableText id="mentions.donnees.stockage" multiline>Ces données sont stockées sur des serveurs sécurisés (Supabase). Elles ne sont ni vendues, ni transmises à des tiers. Chaque couple dispose d&apos;un espace isolé et privé, protégé par des règles d&apos;accès strictes (Row Level Security).</EditableText>
            </p>
            <p className="mt-3">
              <EditableText id="mentions.donnees.rgpd" multiline>Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Pour exercer ce droit, contactez-nous à</EditableText> <a href="mailto:lise.yesbox@gmail.com" style={{ color: 'var(--brand)' }}>lise.yesbox@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.cookies.titre">Cookies</EditableText></h2>
            <p>
              <EditableText id="mentions.cookies.texte" multiline>Le site utilise uniquement un cookie de session pour maintenir votre connexion. Aucun cookie publicitaire ou de tracking n&apos;est utilisé.</EditableText>
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.propriete.titre">Propriété intellectuelle</EditableText></h2>
            <p>
              <EditableText id="mentions.propriete.texte" multiline>L&apos;ensemble du contenu du site (textes, visuels, structure, concept) est la propriété exclusive de YES BOX. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</EditableText>
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.responsabilite.titre">Responsabilité</EditableText></h2>
            <p>
              <EditableText id="mentions.responsabilite.texte" multiline>YES BOX est un programme d&apos;accompagnement pour couples et ne constitue en aucun cas une thérapie de couple, un conseil juridique ou une médiation professionnelle. L&apos;utilisateur reste seul responsable de l&apos;usage qu&apos;il fait du programme.</EditableText>
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.conditions.titre">Conditions d&apos;utilisation &amp; tarifs</EditableText></h2>
            <p>
              <EditableText id="mentions.conditions.intro" multiline>L&apos;utilisation de YES BOX — Le Pacte est soumise aux conditions suivantes, applicables aux deux membres d&apos;un couple :</EditableText>
            </p>
            <ul className="mt-3 space-y-2 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Module 1 gratuit :', 'Free Module 1:')}</strong> {t('le premier module (« Moi et toi ») est accessible gratuitement aux deux membres du couple, sans carte bancaire, jusqu\'à la révélation de vos réponses respectives. Vous découvrez ainsi le fonctionnement du programme avant tout engagement — sans mauvaise surprise.', 'the first module ("Me and You") is free for both members of the couple, no credit card required, until you reveal your answers to each other. This lets you see how the program works before making any commitment — no surprises.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Abonnement mensuel — 29 €/mois :', 'Monthly subscription — €29/month:')}</strong> {t('proposé à votre couple dès la fin du module 1 gratuit, il donne accès aux 10 modules complets, aux sessions de révélation à deux, au journal de couple et au CDD de couple. Le paiement et le renouvellement automatique sont gérés de façon sécurisée par notre prestataire Stripe ; nous ne stockons jamais votre numéro de carte bancaire.', 'offered to your couple as soon as you finish the free module 1, it gives you access to all 10 full modules, joint reveal sessions, your couple\'s journal, and your couple\'s CDD. Payment and automatic renewal are securely handled by our provider, Stripe; we never store your card number.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Renouvellement automatique et résiliation :', 'Automatic renewal and cancellation:')}</strong> {t('sans engagement de durée : l\'abonnement se renouvelle automatiquement chaque mois tant qu\'il n\'a pas été arrêté. Depuis « Mon compte », vous voyez à tout moment la date du prochain renouvellement et pouvez arrêter le renouvellement automatique en un clic ; l\'accès complet reste actif jusqu\'à la fin de la période déjà payée.', 'no long-term commitment: the subscription renews automatically every month until it is stopped. From "My Account", you can see the next renewal date at any time and stop automatic renewal in one click; full access stays active until the end of the period you\'ve already paid for.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Après l\'arrêt de l\'abonnement :', 'After stopping the subscription:')}</strong> {t('une fois la période déjà payée terminée, seules les parties déjà réalisées (modules révélés, journal, CDD déjà rédigé) restent consultables dans votre espace ; les modules non commencés ou non terminés ne sont plus accessibles tant que l\'abonnement n\'est pas repris.', 'once the period you\'ve already paid for ends, only the parts you\'ve already completed (revealed modules, journal, an already-written CDD) remain viewable in your account; modules not started or not finished are no longer accessible until the subscription is resumed.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Conservation des données et clôture du compte :', 'Data retention and account closure:')}</strong> {t('à compter de la fin de votre accès payé (arrêt du renouvellement ou échéance non reconduite), vos données sont conservées 13 mois. Passé ce délai, votre compte est définitivement clos : l\'abonnement ne peut plus être réactivé sur cet espace et vos réponses sont effacées. Pour continuer l\'aventure au-delà de ce délai, il faut recommencer le programme avec un nouveau compte.', 'starting from the end of your paid access (stopped renewal or a period that was not renewed), your data is kept for 13 months. After that period, your account is permanently closed: the subscription can no longer be reactivated on that account and your answers are deleted. To continue past this point, you need to start the program over with a new account.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('BAC annuel (Bilan Annuel de Couple) — 19 €/an :', 'Annual BAC (Bilan Annuel de Couple, or Yearly Couple Check-in) — €19/year:')}</strong> {t('abonnement annuel qui déclenche votre rappel et votre fiche avenant à la date anniversaire de votre couple, et vous permet de refaire l\'intégralité des modules si vous souhaitez recommencer le programme. Annulable à tout moment ; le renouvellement n\'est jamais automatique sans information préalable.', 'an annual subscription that triggers your reminder and your amendment worksheet on your couple\'s anniversary date, and lets you redo all the modules if you want to go through the program again. Cancel anytime; renewal is never automatic without prior notice.')}
              </li>
              <li>
                {t('Les tarifs sont indiqués par couple (un seul abonnement pour les deux membres) et peuvent évoluer ; toute modification vous sera communiquée avant d\'être appliquée à votre abonnement en cours.', 'Prices are shown per couple (a single subscription covers both members) and may change; you\'ll be notified of any change before it applies to your current subscription.')}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.regles.titre">Règles du jeu</EditableText></h2>
            <p>
              <EditableText id="mentions.regles.intro" multiline>Pour que l&apos;expérience reste juste et sincère pour les deux membres du couple, YES BOX applique les règles suivantes :</EditableText>
            </p>
            <ul className="mt-3 space-y-2 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Pairage du couple :', 'Pairing up:')}</strong> {t('le premier membre qui crée son profil obtient un code unique de 5 lettres/chiffres. Le second membre saisit ce code lors de son inscription (ou plus tard, depuis son espace) pour rejoindre le même couple. Un couple ne peut compter que deux membres.', 'the first member to create a profile gets a unique 5-character code (letters/numbers). The second member enters this code when signing up (or later, from their account) to join the same couple. A couple can only have two members.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Réponses individuelles :', 'Individual answers:')}</strong> {t('chaque membre répond seul aux questions de chaque module. Aucun des deux ne peut voir les réponses de l\'autre avant que le module ne soit marqué « révélé ».', 'each member answers the questions in every module on their own. Neither partner can see the other\'s answers until the module is marked as "revealed."')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('La révélation :', 'The reveal:')}</strong> {t('un module n\'est révélé que lorsque les deux membres ont terminé leurs réponses. C\'est à ce moment que le module suivant se débloque.', 'a module is only revealed once both members have finished answering. That\'s when the next module unlocks.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Confidentialité :', 'Privacy:')}</strong> {t('les réponses restent strictement privées entre les deux membres du couple ; elles ne sont jamais partagées à des tiers.', 'your answers stay strictly private between the two of you; they are never shared with third parties.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Le CDD de couple :', 'The couple\'s CDD:')}</strong> {t('rédigé à la fin du programme, il est réexaminé chaque année via le BAC annuel, avec la possibilité de le faire évoluer par avenant.', 'written at the end of the program, it\'s revisited every year through the annual BAC, with the option to update it through an amendment.')}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.contact.titre">Contact</EditableText></h2>
            <p>
              <EditableText id="mentions.contact.texte">Pour toute question :</EditableText> <a href="mailto:lise.yesbox@gmail.com" style={{ color: 'var(--brand)' }}>lise.yesbox@gmail.com</a>
            </p>
          </section>

          <p className="pt-4" style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="mentions.majdate">Dernière mise à jour : septembre 2026</EditableText></p>
        </div>
      </main>

      <footer className="py-8 mt-10" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 text-center" style={{ fontSize: 12, color: 'var(--muted)' }}>
          <EditableText id="mentions.footer.copyright">© 2026 YES BOX ·</EditableText> <Link href="/" style={{ color: 'var(--brand)' }}>yesbox-lepacte.fr</Link>
        </div>
      </footer>
    </div>
  )
}
