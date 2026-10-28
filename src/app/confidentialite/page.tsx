import type { Metadata } from 'next'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import { getLocale, getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment YES BOX — Le Pacte collecte, utilise et protège vos données personnelles.',
  alternates: { canonical: '/confidentialite' },
}

const CONTACT = 'lise.yesbox@gmail.com'

export default async function Confidentialite() {
  const t = getT(await getLocale())
  const h2 = 'font-serif font-bold mb-3'
  const h2Style = { fontSize: 20, color: 'var(--ink)' }
  const liste = 'mt-2 space-y-2 ml-4 list-disc'
  const mail = <a href={`mailto:${CONTACT}`} style={{ color: 'var(--brand)' }}>{CONTACT}</a>

  const traitements: [string, string][] = [
    [t('Créer et gérer votre compte, vous associer à votre partenaire, faire fonctionner le programme (modules, révélations, journal, pacte)', 'Creating and managing your account, pairing you with your partner, running the program (modules, reveals, journal, pact)'),
      t('Exécution du contrat (art. 6.1.b RGPD)', 'Performance of the contract (GDPR art. 6.1.b)')],
    [t('Enregistrer vos réponses, qui peuvent révéler des données sensibles (vie intime, convictions religieuses)', 'Storing your answers, which may reveal sensitive data (intimate life, religious beliefs)'),
      t('Votre consentement explicite, recueilli à l’inscription (art. 9.2.a RGPD), retirable à tout moment en supprimant votre compte', 'Your explicit consent, collected at sign-up (GDPR art. 9.2.a), which you can withdraw at any time by deleting your account')],
    [t('Gérer l’abonnement, les paiements et la facturation', 'Managing the subscription, payments and invoicing'),
      t('Exécution du contrat, et obligation légale de conservation des pièces comptables (art. 6.1.b et 6.1.c RGPD)', 'Performance of the contract, and the legal obligation to keep accounting records (GDPR art. 6.1.b and 6.1.c)')],
    [t('Vendre les cartes cadeaux : paiement, envoi du code à la personne qui achète, carte à imprimer, activation par le couple', 'Selling gift cards: payment, sending the code to the buyer, printable card, activation by the couple'),
      t('Exécution du contrat, et obligation légale de conservation des pièces comptables (art. 6.1.b et 6.1.c RGPD)', 'Performance of the contract, and the legal obligation to keep accounting records (GDPR art. 6.1.b and 6.1.c)')],
    [t('Appliquer la durée de conservation : date de votre dernière visite, pour effacer les comptes inactifs depuis 24 mois et vous prévenir avant', 'Applying the retention period: the date of your last visit, to delete accounts inactive for 24 months and warn you beforehand'),
      t('Obligation légale de limiter la conservation des données (art. 5.1.e et 6.1.c RGPD)', 'Legal obligation to limit data retention (GDPR art. 5.1.e and 6.1.c)')],
    [t('Envoyer les e-mails de service (confirmation d’inscription, bienvenue, mot de passe, sécurité)', 'Sending service emails (sign-up confirmation, welcome, password, security)'),
      t('Exécution du contrat (art. 6.1.b RGPD)', 'Performance of the contract (GDPR art. 6.1.b)')],
    [t('Envoyer des rappels pour accompagner votre parcours (parcours en pause depuis 10 jours, e-mails réguliers une fois le pacte signé, 2 par mois maximum, e-mails pour vos anniversaires de couple et de mariage si vous avez indiqué ces dates), désactivables depuis Mon compte ou en bas de chaque e-mail', 'Sending reminders to support your program (program paused for 10 days, regular emails once the pact is signed, 2 per month at most, emails for your couple and wedding anniversaries if you entered those dates), which you can turn off from My Account or at the bottom of each email'),
      t('Exécution du contrat et intérêt légitime à vous accompagner dans le programme (art. 6.1.b et 6.1.f RGPD)', 'Performance of the contract and legitimate interest in supporting you through the program (GDPR art. 6.1.b and 6.1.f)')],
    [t('Sécuriser le service (limitation des tentatives de connexion, prévention des abus)', 'Securing the service (limiting login attempts, preventing abuse)'),
      t('Intérêt légitime à protéger le service et vos données (art. 6.1.f RGPD)', 'Legitimate interest in protecting the service and your data (GDPR art. 6.1.f)')],
  ]

  const sousTraitants: [string, string, string][] = [
    ['Vercel Inc.', t('Hébergement du site', 'Website hosting'), t('États-Unis', 'United States')],
    ['Supabase Inc.', t('Base de données et authentification', 'Database and authentication'), t('Irlande (UE) — base hébergée dans la région eu-west-1', 'Ireland (EU) — database hosted in the eu-west-1 region')],
    ['Stripe Payments Europe, Ltd.', t('Paiement de l’abonnement et des cartes cadeaux (nous ne voyons jamais votre numéro de carte)', 'Payment for subscriptions and gift cards (we never see your card number)'), t('Irlande (UE), avec transferts possibles vers les États-Unis', 'Ireland (EU), with possible transfers to the United States')],
    ['Google LLC (Gmail)', t('Envoi des e-mails de service', 'Sending service emails'), t('États-Unis', 'United States')],
    ['Resend Inc.', t('Envoi des e-mails de service', 'Sending service emails'), t('États-Unis', 'United States')],
    ['Cloudflare, Inc. (Turnstile)', t('Vérification anti-robot à l’inscription (adresse IP et informations techniques du navigateur, sans cookie publicitaire)', 'Anti-bot check at sign-up (IP address and technical browser information, no advertising cookie)'), t('États-Unis', 'United States')],
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <Link href="/" className="btn-ghost text-sm py-2 px-4">← {t('Retour', 'Back')}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="eyebrow mb-4">{t('Légal', 'Legal')}</div>
        <h1 className="font-serif text-4xl font-bold mb-10" style={{ color: 'var(--ink)' }}>{t('Politique de confidentialité', 'Privacy Policy')}</h1>

        <div className="space-y-10" style={{ color: 'var(--ink-2)', lineHeight: 1.8, fontSize: 14.5 }}>
          <section>
            <h2 className={h2} style={h2Style}>{t('Responsable du traitement', 'Data controller')}</h2>
            <p>Lise YESSOUROUR — 15 résidence des Charmilles, 78590 Noisy-le-Roi, France — {mail}</p>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Données collectées', 'Data we collect')}</h2>
            <ul className={liste} style={{ color: 'var(--muted)' }}>
              <li>{t('Compte : prénom, adresse e-mail, mot de passe (stocké chiffré, jamais lisible).', 'Account: first name, email address, password (stored encrypted, never readable).')}</li>
              <li>{t('Espace couple : nom du couple, vos grandes dates si vous les indiquez (anniversaire de couple, date de mariage), code couple, code de parrainage.', 'Couple space: couple name, your big dates if you enter them (couple anniversary, wedding date), couple code, referral code.')}</li>
              <li>{t('Contenu du programme : vos réponses aux modules, vos conclusions, votre pacte et vos réponses aux questions du mois. Certaines questions portent sur la vie intime ou les convictions religieuses : ce sont des données sensibles, traitées uniquement avec votre consentement explicite.', 'Program content: your module answers, your conclusions, your pact and your answers to the monthly questions. Some questions relate to intimate life or religious beliefs: this is sensitive data, processed only with your explicit consent.')}</li>
              <li>{t('Abonnement : statut, dates de renouvellement et identifiants Stripe (pas vos données bancaires).', 'Subscription: status, renewal dates and Stripe identifiers (not your banking details).')}</li>
              <li>{t('Cartes cadeaux : adresse e-mail de la personne qui achète, prénoms facultatifs imprimés sur la carte (« Pour vous deux », « De la part de »), durée, montant et date d’achat, code, et couple qui l’a utilisé.', 'Gift cards: the buyer’s email address, optional first names printed on the card ("For the two of you", "From"), length, amount and date of purchase, code, and the couple who used it.')}</li>
              <li>{t('Activité : date de votre dernière visite sur le site, pour appliquer la durée de conservation ci-dessous.', 'Activity: the date of your last visit to the site, to apply the retention period below.')}</li>
              <li>{t('Preuves de consentement : date à laquelle vous avez certifié avoir 15 ans ou plus et accepté le traitement des données sensibles.', 'Proof of consent: the date you certified being 15 or older and agreed to the processing of sensitive data.')}</li>
              <li>{t('Sécurité : tentatives de connexion échouées (pour bloquer temporairement les attaques).', 'Security: failed login attempts (to temporarily block attacks).')}</li>
            </ul>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Pourquoi nous les utilisons, et sur quelle base légale', 'Why we use it, and on what legal basis')}</h2>
            <div className="space-y-3">
              {traitements.map(([finalite, base]) => (
                <div key={finalite} className="surface p-4">
                  <p style={{ color: 'var(--ink)' }}>{finalite}</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>{t('Base légale :', 'Legal basis:')} {base}</p>
                </div>
              ))}
            </div>
            <p className="mt-3">{t('Vos données ne sont jamais vendues ni utilisées à des fins publicitaires.', 'Your data is never sold or used for advertising.')}</p>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Qui peut y accéder', 'Who can access it')}</h2>
            <ul className={liste} style={{ color: 'var(--muted)' }}>
              <li>{t('Votre partenaire : uniquement vos réponses aux modules révélés, et le journal et le pacte de votre couple.', 'Your partner: only your answers to revealed modules, and your couple’s journal and pact.')}</li>
              <li>{t('L’administration du site : vos informations de compte, vos grandes dates (anniversaire de couple, date de mariage), pour préparer les e-mails liés à vos anniversaires (avec un rappel interne un mois avant), et votre progression (modules commencés, terminés, révélés), sans accès au contenu de vos réponses, de vos conclusions ou de votre pacte.', 'Site administration: your account details, your big dates (couple anniversary, wedding date), to prepare emails for your anniversaries (with an internal reminder a month ahead), and your progress (modules started, finished, revealed), with no access to the content of your answers, conclusions or pact.')}</li>
              <li>{t('Nos sous-traitants techniques, uniquement pour les besoins du service et dans le cadre d’un contrat conforme au RGPD :', 'Our technical processors, only as needed to run the service and under a GDPR-compliant contract:')}</li>
            </ul>
            <div className="mt-3 overflow-x-auto">
              <table style={{ width: '100%', fontSize: 13.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th className="py-2 pr-3">{t('Prestataire', 'Provider')}</th>
                    <th className="py-2 pr-3">{t('Rôle', 'Role')}</th>
                    <th className="py-2">{t('Localisation', 'Location')}</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--muted)' }}>
                  {sousTraitants.map(([nom, role, lieu]) => (
                    <tr key={nom} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="py-2 pr-3" style={{ color: 'var(--ink-2)' }}>{nom}</td>
                      <td className="py-2 pr-3">{role}</td>
                      <td className="py-2">{lieu}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Transferts hors de l’Union européenne', 'Transfers outside the European Union')}</h2>
            <p>
              {t(
                'Votre base de données (réponses, comptes) est hébergée dans l’Union européenne, en Irlande. Certains prestataires techniques sont toutefois situés aux États-Unis (hébergement du site, envoi des e-mails, et le cas échéant paiement ou assistance technique). Ces transferts sont encadrés par les clauses contractuelles types adoptées par la Commission européenne (art. 46 RGPD) et, pour les sociétés américaines certifiées, par le cadre de protection des données UE–États-Unis (Data Privacy Framework, décision d’adéquation du 10 juillet 2023). Vous pouvez obtenir une copie de ces garanties en nous écrivant.',
                'Your database (answers, accounts) is hosted in the European Union, in Ireland. Some technical providers are however located in the United States (website hosting, email delivery, and where applicable payment or technical support). These transfers are covered by the standard contractual clauses adopted by the European Commission (GDPR art. 46) and, for certified US companies, by the EU–US Data Privacy Framework (adequacy decision of 10 July 2023). You can get a copy of these safeguards by writing to us.',
              )}
            </p>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Durées de conservation', 'Retention periods')}</h2>
            <ul className={liste} style={{ color: 'var(--muted)' }}>
              <li>{t('Compte : tant que vous utilisez le service.', 'Account: for as long as you use the service.')}</li>
              <li>{t('Après 24 mois d’inactivité (aucune connexion d’un membre du couple, aucune réponse enregistrée et plus d’accès payé ou offert en cours) : vos comptes, réponses, conclusions et pacte sont définitivement effacés. Un e-mail vous prévient 2 mois, 1 mois, 1 semaine et la veille ; il suffit de vous connecter pour repousser l’effacement de 24 mois.', 'After 24 months of inactivity (no login by either member of the couple, no answer saved, and no paid or gifted access in progress): your accounts, answers, conclusions and pact are permanently deleted. An email warns you 2 months, 1 month, 1 week and the day before; simply log in to postpone the deletion by 24 months.')}</li>
              <li>{t('Cartes cadeaux : 24 mois après la fin de validité de la carte (soit 3 ans après l’achat).', 'Gift cards: 24 months after the card’s validity ends (i.e. 3 years after purchase).')}</li>
              <li>{t('Factures : 10 ans, conservées par Stripe et pour notre comptabilité (obligation légale).', 'Invoices: 10 years, kept by Stripe and for our accounting (legal obligation).')}</li>
              <li>{t('Suppression de votre compte à votre demande : effacement immédiat.', 'Deleting your account at your request: immediate erasure.')}</li>
            </ul>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Vos droits', 'Your rights')}</h2>
            <p>
              {t(
                'Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité et d’opposition, du droit de retirer votre consentement à tout moment, et du droit de définir des directives sur le sort de vos données après votre décès.',
                'You have the right of access, rectification, erasure, restriction, portability and objection, the right to withdraw your consent at any time, and the right to set instructions for what happens to your data after your death.',
              )}
            </p>
            <ul className={liste} style={{ color: 'var(--muted)' }}>
              <li>{t('Depuis « Mon compte » : modifier vos informations, télécharger vos données, supprimer votre compte.', 'From “My Account”: edit your information, download your data, delete your account.')}</li>
              <li>{t('Pour toute autre demande, écrivez à', 'For any other request, write to')} {mail}. {t('Nous répondons sous un mois.', 'We reply within one month.')}</li>
            </ul>
            <p className="mt-3">
              {t(
                'Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission nationale de l’informatique et des libertés), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou en ligne sur',
                'If you believe your rights are not being respected, you can file a complaint with the CNIL (the French data protection authority), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France, or online at',
              )}{' '}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>www.cnil.fr/fr/plaintes</a>.
            </p>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Âge minimum', 'Minimum age')}</h2>
            <p>{t('Le service est réservé aux personnes de 15 ans ou plus. Nous ne collectons pas sciemment de données concernant des personnes plus jeunes.', 'The service is reserved for people aged 15 or over. We do not knowingly collect data about younger people.')}</p>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>{t('Sécurité', 'Security')}</h2>
            <p>
              {t(
                'Connexion chiffrée (HTTPS), mots de passe chiffrés, réponses aux modules, conclusions du journal et texte du pacte chiffrés sur nos serveurs (AES-256) avec une clé que seul le serveur du site détient, espace de chaque couple isolé par des règles d’accès en base de données, blocage temporaire après plusieurs échecs de connexion, et double authentification disponible pour l’administration.',
                'Encrypted connection (HTTPS), encrypted passwords, module answers, journal conclusions and pact text encrypted on our servers (AES-256) with a key held only by the site’s server, each couple’s space isolated by database access rules, temporary lockout after several failed logins, and two-factor authentication available for administration.',
              )}
            </p>
          </section>

          <section>
            <h2 className={h2} style={h2Style}>Cookies</h2>
            <p>
              {t(
                'Le site utilise uniquement des cookies strictement nécessaires, qui ne demandent pas de consentement : le cookie de session qui vous garde connecté·e, un cookie qui mémorise votre langue (1 an) et un cookie technique qui évite d’enregistrer votre visite à chaque page (12 heures). Aucun cookie publicitaire ni de mesure d’audience.',
                'The site only uses strictly necessary cookies, which do not require consent: the session cookie that keeps you logged in, a cookie that remembers your language (1 year) and a technical cookie that avoids recording your visit on every page (12 hours). No advertising or analytics cookies.',
              )}
            </p>
          </section>

          <p className="pt-4" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {t('Dernière mise à jour : octobre 2026. Voir aussi les', 'Last updated: October 2026. See also the')}{' '}
            <Link href="/mentions-legales" style={{ color: 'var(--brand)' }}>{t('mentions légales', 'legal notice')}</Link>{t(' et les ', ' and the ')}
            <Link href="/cgv" style={{ color: 'var(--brand)' }}>{t('conditions générales de vente', 'terms of sale')}</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
