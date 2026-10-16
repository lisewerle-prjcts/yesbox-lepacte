import type { Metadata } from 'next'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { getLocale, getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description: 'Conditions générales de vente de YES BOX — Le Pacte.',
  robots: { index: false, follow: false },
}

// Médiateur de la consommation (art. L612-1 du Code de la consommation).
// TODO : remplacer les champs entre crochets par le médiateur retenu.
export default async function Cgv() {
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
        <h1 className="font-serif text-4xl font-bold mb-10" style={{ color: 'var(--ink)' }}><EditableText id="cgv.titre">Conditions générales de vente</EditableText></h1>

        <div className="space-y-10" style={{ color: 'var(--ink-2)', lineHeight: 1.8, fontSize: 14.5 }}>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('1. Objet et acceptation', '1. Purpose and acceptance')}</h2>
            <p>
              {t(
                'Les présentes conditions générales de vente (CGV) s’appliquent à l’utilisation du programme YES BOX — Le Pacte, proposé sur le site yesbox-lepacte.fr, et à tout abonnement souscrit par un couple. Elles s’appliquent aux deux membres du couple.',
                'These terms of sale apply to the use of the YES BOX — Le Pacte program, offered on yesbox-lepacte.fr, and to any subscription taken out by a couple. They apply to both members of the couple.'
              )}
            </p>
            <p className="mt-2">
              {t(
                'Le programme est proposé par Lise YESSOUROUR, sous le nom commercial YES BOX, 15 résidence des Charmilles, 78590 Noisy-le-Roi, France — SIREN 514 073 691, RCS Versailles — lise.yesbox@gmail.com. TVA non applicable, article 293 B du Code général des impôts.',
                'The program is offered by Lise YESSOUROUR, under the trade name YES BOX, 15 résidence des Charmilles, 78590 Noisy-le-Roi, France — SIREN 514 073 691, Versailles Trade and Companies Register — lise.yesbox@gmail.com. VAT not applicable, article 293 B of the French General Tax Code.'
              )}
            </p>
            <p className="mt-2">
              {t(
                'Avant tout paiement, vous acceptez les CGV en cochant la case « J’ai lu et j’accepte les CGV ». Les CGV applicables sont celles en vigueur le jour de votre souscription.',
                'Before any payment, you accept these terms by ticking the box “I have read and accept the terms of sale”. The applicable terms are those in force on the day you subscribe.'
              )}
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="cgv.fonctionnement.titre">2. Fonctionnement du programme</EditableText></h2>
            <p>
              <EditableText id="mentions.regles.intro" multiline>Pour que l&apos;expérience reste juste et sincère pour les deux membres du couple, YES BOX applique les règles suivantes :</EditableText>
            </p>
            <ul className="mt-3 space-y-2 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Pairage du couple :', 'Pairing up:')}</strong> {t('le premier membre qui crée son profil obtient un code unique de 5 lettres/chiffres. Le second membre saisit ce code lors de son inscription (ou plus tard, depuis son espace) pour rejoindre le même couple. Un couple ne peut compter que deux membres.', 'the first member to create a profile gets a unique 5-character code (letters/numbers). The second member enters this code when signing up (or later, from their account) to join the same couple. A couple can only have two members.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Réponses individuelles :', 'Individual answers:')}</strong> {t('chaque membre répond de son côté aux questions de chaque module. Personne ne peut voir les réponses de l\'autre avant que les deux membres du couple aient terminé les leurs.', 'each member answers the questions in every module on their own. No one can see the other\'s answers until both members of the couple have finished theirs.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('La révélation :', 'The reveal:')}</strong> {t('un module n\'est révélé que lorsque les deux membres ont terminé leurs réponses : vous découvrez alors vos réponses ensemble. Chaque membre écrit ensuite sa conclusion dans votre journal, en répondant à deux courtes questions ; une fois vos deux conclusions écrites, et si votre abonnement est à jour, le module suivant se débloque.', 'a module is only revealed once both members have finished answering: you then discover your answers together. Each member then writes their conclusion in your journal, answering two short questions; once both conclusions are written, and if your subscription is up to date, the next module unlocks.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Durée des modules :', 'Module length:')}</strong> {t('chaque module compte une dizaine de questions. À deux, il faut compter entre 30 et 60 minutes, en fonction des discussions qui vont en découler. Il faut donc y dédier 9 petits bouts de soirée.', 'each module has about ten questions. Together, plan for 30 to 60 minutes, depending on the conversations they spark. In all, that means setting aside 9 short evenings.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Confidentialité :', 'Privacy:')}</strong> {t('les modules sont réalisés entre vous deux, sans jugement. Personne d\'autre ne lit vos réponses : elles restent visibles uniquement pour vous deux et sont chiffrées sur nos serveurs. Vous pouvez les télécharger à tout moment, et les effacer quand vous quittez le programme. Et pas de jugement : ni thérapeute, ni intelligence artificielle n\'analyse ce que vous écrivez. Juste des questions pour vous aider à vous parler. Les personnes en charge de l\'administration de YES BOX n\'ont pas accès aux réponses des couples. En fin de parcours, si vous souhaitez garder vos réponses, vous pouvez les télécharger dans la rubrique MON COMPTE. Sans action de votre part, 1 an après la fin de votre abonnement, vos comptes sont supprimés et vos réponses sont effacées de manière permanente. Un e-mail vous prévient 2 mois, 1 mois, 1 semaine et la veille de l\'effacement.', 'you go through the modules just the two of you, without judgment. No one else reads your answers: they stay visible only to the two of you and are encrypted on our servers. You can download them at any time, and delete them when you leave the program. And no judgment: no therapist and no artificial intelligence analyzes what you write. Just questions to help you talk to each other. The people who run YES BOX have no access to couples\' answers. At the end of your journey, if you want to keep your answers, you can download them from the MY ACCOUNT section. Without any action on your part, 1 year after your subscription ends, your accounts are deleted and your answers are permanently erased. An email warns you 2 months, 1 month, 1 week and the day before the deletion.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Le pacte de couple :', 'The couple\'s pact:')}</strong> {t('écrit à deux à la fin du parcours initial (module 9). En le signant, vous choisissez la date de votre rendez-vous annuel, idéalement un an plus tard (entre 6 et 18 mois) : dans un an, à la Saint-Valentin ou à une date qui vous est propre. Ce jour-là, le module « Notre rendez-vous annuel » s\'ouvre pour le relire ensemble et le faire évoluer avec vous.', 'written together at the end of the initial program (module 9). When you sign it, you choose the date of your yearly date, ideally one year later (between 6 and 18 months): one year from now, on Valentine\'s Day, or on a date that means something to you. On that day, the "Our Yearly Date" module opens so you can reread it together and make it grow with you.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('E-mails de rappel :', 'Reminder emails:')}</strong> {t('si votre parcours est en pause depuis 10 jours, YES BOX vous envoie un petit rappel (deux au maximum). Une fois votre pacte signé, vous recevez des e-mails réguliers pour faire vivre vos engagements (2 par mois maximum). Vous pouvez désactiver ces rappels à tout moment dans « Mon compte », où vous choisissez aussi la langue du site et des e-mails.', 'if your program has been paused for 10 days, YES BOX sends you a gentle reminder (two at most). Once your pact is signed, you receive regular emails to keep your commitments alive (2 per month at most). You can turn these reminders off at any time in "My Account", where you also choose the language of the site and emails.')}
              </li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="cgv.offres.titre">3. Offres, tarifs et durée</EditableText></h2>
            <p>
              <EditableText id="mentions.conditions.intro" multiline>L&apos;utilisation de YES BOX — Le Pacte est soumise aux conditions suivantes, applicables aux deux membres d&apos;un couple :</EditableText>
            </p>
            <ul className="mt-3 space-y-2 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Module 1 gratuit :', 'Free Module 1:')}</strong> {t('le premier module (« Toi et Moi ») est accessible gratuitement aux deux membres du couple, sans carte bancaire, jusqu\'à la révélation de vos réponses respectives. Vous découvrez ainsi le fonctionnement du programme avant tout engagement — sans mauvaise surprise.', 'the first module ("You and Me") is free for both members of the couple, no credit card required, until you reveal your answers to each other. This lets you see how the program works before making any commitment — no surprises.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Abonnement mensuel — 29 €/mois :', 'Monthly subscription — €29/month:')}</strong> {t('proposé à votre couple dès la fin du module 1 gratuit, il donne accès aux 9 modules du parcours initial, aux sessions de révélation à deux, au journal de couple et au pacte de couple. Le paiement et le renouvellement automatique sont gérés de façon sécurisée par notre prestataire Stripe ; nous ne stockons jamais votre numéro de carte bancaire.', 'offered to your couple as soon as you finish the free module 1, it gives you access to the 9 modules of the initial program, joint reveal sessions, your couple\'s journal, and your couple\'s pact. Payment and automatic renewal are securely handled by our provider, Stripe; we never store your card number.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Renouvellement automatique et résiliation :', 'Automatic renewal and cancellation:')}</strong> {t('sans engagement de durée : l\'abonnement se renouvelle automatiquement chaque mois tant qu\'il n\'a pas été arrêté. Depuis « Mon compte », vous voyez à tout moment la date du prochain renouvellement et pouvez arrêter le renouvellement automatique en un clic ; l\'accès complet reste actif jusqu\'à la fin de la période déjà payée.', 'no long-term commitment: the subscription renews automatically every month until it is stopped. From "My Account", you can see the next renewal date at any time and stop automatic renewal in one click; full access stays active until the end of the period you\'ve already paid for.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Après l\'arrêt de l\'abonnement :', 'After stopping the subscription:')}</strong> {t('une fois la période déjà payée terminée, seules les parties déjà réalisées (modules révélés, journal, pacte déjà écrit) restent consultables dans votre espace ; les modules non commencés ou non terminés ne sont plus accessibles tant que l\'abonnement n\'est pas repris.', 'once the period you\'ve already paid for ends, only the parts you\'ve already completed (revealed modules, journal, an already-written pact) remain viewable in your account; modules not started or not finished are no longer accessible until the subscription is resumed.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Conservation des données et clôture du compte :', 'Data retention and account closure:')}</strong> {t('à compter de la fin de votre accès payé (arrêt du renouvellement ou échéance non reconduite), vos données sont conservées 1 an. Vous recevez un e-mail 2 mois, 1 mois, 1 semaine et la veille de leur effacement, pour pouvoir les télécharger depuis « Mon compte ». Passé ce délai, votre compte est définitivement clos : l\'abonnement ne peut plus être réactivé sur cet espace et vos réponses sont effacées. Pour continuer l\'aventure au-delà de ce délai, il faut recommencer le programme avec un nouveau compte.', 'starting from the end of your paid access (stopped renewal or a period that was not renewed), your data is kept for 1 year. You receive an email 2 months, 1 month, 1 week and the day before it is deleted, so you can download it from "My Account". After that period, your account is permanently closed: the subscription can no longer be reactivated on that account and your answers are deleted. To continue past this point, you need to start the program over with a new account.')}
              </li>
              <li>
                <strong style={{ color: 'var(--ink-2)' }}>{t('Pacte – notre rendez-vous annuel — 19 €/an :', 'Pact – our yearly date — €19/year:')}</strong> {t('proposé à votre couple une fois votre pacte signé, il remplace l\'abonnement mensuel. Il donne accès pendant 1 an (365 jours) au module « Notre rendez-vous annuel » à la date que vous avez choisie et à l\'intégralité des modules si vous souhaitez refaire le programme. Si un abonnement mensuel est en cours, la bascule est programmée automatiquement à la signature du pacte par les deux membres du couple et a lieu à la fin du mois déjà payé : vous recevez un e-mail quelques jours avant, les 19 € sont prélevés à cette date, et l\'année d\'accès commence ce jour-là. Vous pouvez annuler cette bascule à tout moment avant cette date depuis « Mon compte ». Il se renouvelle chaque année ; vous recevez un e-mail avant chaque renouvellement et pouvez le résilier à tout moment depuis « Mon compte » : l\'accès reste alors garanti jusqu\'au dernier jour de l\'année déjà payée.', 'offered to your couple once your pact is signed, it replaces the monthly subscription. It gives you 1 year (365 days) of access to the "Our Yearly Date" module on the date you chose, and to all the modules if you want to go through the program again. If a monthly subscription is in progress, the switch is scheduled automatically once both members of the couple have signed the pact, and happens at the end of the month already paid for: you receive an email a few days before, the €19 is charged on that date, and your year of access starts that day. You can cancel this switch anytime before that date from "My Account". It renews every year; you are notified by email before each renewal and can cancel anytime from "My Account": access then stays guaranteed until the last day of the year already paid for.')}
              </li>
              <li>
                {t('Les tarifs sont indiqués en euros, par couple (un seul abonnement pour les deux membres), TVA non applicable (article 293 B du Code général des impôts). Ils peuvent évoluer ; toute modification vous sera communiquée avant d\'être appliquée à votre abonnement en cours.', 'Prices are shown in euros, per couple (a single subscription covers both members), VAT not applicable (article 293 B of the French General Tax Code). They may change; you\'ll be notified of any change before it applies to your current subscription.')}
              </li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('4. Paiement et facturation', '4. Payment and invoicing')}</h2>
            <p>
              {t(
                'Le paiement s’effectue par carte bancaire, via notre prestataire de paiement Stripe : à la souscription, puis à chaque renouvellement (chaque mois pour l’abonnement mensuel, chaque année pour l’abonnement annuel). Un reçu vous est envoyé par e-mail après chaque paiement. Nous ne stockons jamais votre numéro de carte bancaire.',
                'Payment is made by card, through our payment provider Stripe: when you subscribe, then at each renewal (every month for the monthly subscription, every year for the yearly subscription). A receipt is emailed to you after each payment. We never store your card number.'
              )}
            </p>
            <p className="mt-2">
              {t(
                'En cas d’échec de paiement, Stripe fait de nouvelles tentatives ; tant que le paiement n’a pas abouti, l’accès aux modules payants non encore réalisés peut être suspendu.',
                'If a payment fails, Stripe tries again; until the payment succeeds, access to paid modules you have not yet completed may be suspended.'
              )}
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('5. Droit de rétractation', '5. Right of withdrawal')}</h2>
            <p>
              {t(
                'Conformément à l’article L221-18 du Code de la consommation, vous disposez d’un délai de 14 jours à compter de votre souscription pour vous rétracter, sans avoir à vous justifier, en écrivant à lise.yesbox@gmail.com. Vous êtes alors remboursé·e sous 14 jours.',
                'In accordance with article L221-18 of the French Consumer Code, you have 14 days from your subscription to withdraw, without giving any reason, by writing to lise.yesbox@gmail.com. You are then refunded within 14 days.'
              )}
            </p>
            <p className="mt-2">
              {t(
                'L’accès aux modules payants étant immédiat, vous pouvez demander à commencer le programme avant la fin de ce délai : en cochant la case « Je demande l’accès immédiat et renonce à mon droit de rétractation dès cet accès » avant le paiement, vous demandez l’accès immédiat et reconnaissez perdre votre droit de rétractation dès que cet accès vous est ouvert (article L221-28 du Code de la consommation).',
                'Since access to the paid modules is immediate, you can ask to start the program before this period ends: by ticking the box “I request immediate access and waive my right of withdrawal as of that access” before payment, you request immediate access and acknowledge that you lose your right of withdrawal as soon as this access is granted (article L221-28 of the French Consumer Code).'
              )}
            </p>
            <p className="mt-2">
              {t('Pour exercer ce droit, vous pouvez nous adresser une déclaration claire par e-mail, ou utiliser le formulaire type ci-dessous :', 'To exercise this right, you can send us a clear statement by email, or use the model form below:')}
            </p>
            <div className="mt-2 p-4" style={{ border: '1px solid var(--line)', borderRadius: 8, color: 'var(--muted)', fontSize: 13.5 }}>
              <p className="font-semibold" style={{ color: 'var(--ink-2)' }}>{t('Formulaire de rétractation', 'Withdrawal form')}</p>
              <p className="mt-1">{t('(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)', '(Please complete and return this form only if you wish to withdraw from the contract.)')}</p>
              <p className="mt-1">{t('À l’attention de Lise YESSOUROUR, YES BOX, 15 résidence des Charmilles, 78590 Noisy-le-Roi, France — lise.yesbox@gmail.com :', 'To Lise YESSOUROUR, YES BOX, 15 résidence des Charmilles, 78590 Noisy-le-Roi, France — lise.yesbox@gmail.com:')}</p>
              <p className="mt-1">{t('Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la prestation de services ci-dessous :', 'I/We (*) hereby give notice that I/we (*) withdraw from my/our (*) contract for the provision of the following service:')}</p>
              <ul className="mt-1 ml-4 list-disc">
                <li>{t('Souscrit le :', 'Subscribed on:')}</li>
                <li>{t('Nom du (des) consommateur(s) :', 'Name of consumer(s):')}</li>
                <li>{t('Adresse du (des) consommateur(s) :', 'Address of consumer(s):')}</li>
                <li>{t('Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :', 'Signature of consumer(s) (only if this form is notified on paper):')}</li>
                <li>{t('Date :', 'Date:')}</li>
              </ul>
              <p className="mt-1">{t('(*) Rayez la mention inutile.', '(*) Delete as appropriate.')}</p>
            </div>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('6. Garanties légales', '6. Legal guarantees')}</h2>
            <p>
              {t(
                'YES BOX est tenu de vous fournir un contenu et un service numériques conformes au contrat, conformément aux articles L224-25-12 et suivants du Code de la consommation. En cas de défaut de conformité, écrivez-nous à lise.yesbox@gmail.com : vous pouvez obtenir la mise en conformité du service ou, à défaut, une réduction du prix ou la résolution du contrat.',
                'YES BOX must provide digital content and a digital service that conform to the contract, in accordance with articles L224-25-12 et seq. of the French Consumer Code. If something does not conform, write to us at lise.yesbox@gmail.com: you can have the service brought into conformity or, failing that, obtain a price reduction or the termination of the contract.'
              )}
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="cgv.responsabilite.titre">7. Responsabilité</EditableText></h2>
            <p>
              <EditableText id="mentions.responsabilite.texte.v2" multiline>YES BOX est un programme d&apos;accompagnement pour couples et ne constitue en aucun cas une thérapie de couple, un conseil juridique ou une médiation professionnelle. La personne qui utilise le programme en reste seule responsable.</EditableText>
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('8. Données personnelles', '8. Personal data')}</h2>
            <p>
              {t('Le traitement de vos données personnelles est décrit dans notre', 'How we process your personal data is described in our')}{' '}
              <Link href="/confidentialite" style={{ color: 'var(--brand)' }}>{t('politique de confidentialité', 'privacy policy')}</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('9. Médiation de la consommation', '9. Consumer mediation')}</h2>
            <p>
              {t(
                'Conformément aux articles L.612-1 et suivants du Code de la consommation, en cas de litige non résolu après réclamation écrite adressée à YES BOX, vous pouvez recourir gratuitement au médiateur de la consommation suivant : [NOM DU MÉDIATEUR], [adresse postale], [site internet / formulaire de saisine]. La saisine du médiateur est possible dans un délai d’un an à compter de votre réclamation écrite auprès de YES BOX.',
                'In accordance with articles L.612-1 et seq. of the French Consumer Code, if a dispute is not resolved after a written complaint to YES BOX, you can refer it free of charge to the following consumer mediator: [MEDIATOR NAME], [postal address], [website / referral form]. You can refer the matter to the mediator within one year of your written complaint to YES BOX.'
              )}
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('10. Droit applicable et litiges', '10. Governing law and disputes')}</h2>
            <p>
              {t(
                'Les présentes CGV sont soumises au droit français. En cas de litige, nous cherchons d’abord une solution amiable, puis, le cas échéant, une solution par la médiation. À défaut, vous pouvez saisir la juridiction du lieu où vous demeuriez au moment de la souscription ou de la survenance du fait dommageable.',
                'These terms are governed by French law. In case of a dispute, we first look for an amicable solution, then, where appropriate, mediation. Failing that, you can refer the matter to the court of the place where you lived when you subscribed or when the harmful event occurred.'
              )}
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="cgv.contact.titre">11. Contact</EditableText></h2>
            <p>
              <EditableText id="mentions.contact.texte">Pour toute question :</EditableText> <a href="mailto:lise.yesbox@gmail.com" style={{ color: 'var(--brand)' }}>lise.yesbox@gmail.com</a>
            </p>
          </section>
          <p className="pt-4" style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="cgv.majdate">Dernière mise à jour : octobre 2026</EditableText></p>
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
