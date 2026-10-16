import type { Metadata } from 'next'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { getLocale, getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de YES BOX — Le Pacte.',
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
              <li>{t('Nom commercial :', 'Trade name:')} YES BOX</li>
              <li>{t('Édité par :', 'Published by:')} Lise YESSOUROUR</li>
              <li>{t('SIREN :', 'Company number (SIREN):')} 514 073 691 — {t('RCS Versailles', 'Versailles Trade and Companies Register (RCS)')}</li>
              <li>{t('Adresse :', 'Address:')} 15 résidence des Charmilles, 78590 Noisy-le-Roi, France</li>
              <li>{t('TVA non applicable, article 293 B du Code général des impôts', 'VAT not applicable, article 293 B of the French General Tax Code')}</li>
              <li>{t('Responsable de la publication :', 'Publication director:')} Lise YESSOUROUR</li>
              <li>{t('Adresse e-mail :', 'Email address:')} <a href="mailto:lise.yesbox@gmail.com" style={{ color: 'var(--brand)' }}>lise.yesbox@gmail.com</a></li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.hebergement.titre">Hébergement</EditableText></h2>
            <p><EditableText id="mentions.hebergement.texte">Le site est hébergé par :</EditableText></p>
            <ul className="mt-2 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>Vercel Inc. — {t('Siège social :', 'Head office:')} 440 N Barranca Avenue #4133, Covina, CA 91723, {t('États-Unis', 'USA')} — {t('Contact :', 'Contact:')} <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>vercel.com/contact</a> — {t('Site :', 'Website:')} <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>vercel.com</a></li>
              <li>Supabase Inc. ({t('base de données', 'database')}) — {t('données hébergées en Irlande (UE), région eu-west-1', 'data hosted in Ireland (EU), eu-west-1 region')}</li>
              <li>Stripe Payments Europe, Ltd. ({t('paiement de l’abonnement', 'subscription payment')}) — {t('Irlande', 'Ireland')}</li>
            </ul>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.donnees.titre">Données personnelles</EditableText></h2>
            <p>
              {t('La collecte et l’utilisation de vos données (bases légales, prestataires, transferts hors UE, durées de conservation, vos droits et la réclamation auprès de la CNIL) sont détaillées dans notre', 'How we collect and use your data (legal bases, providers, transfers outside the EU, retention periods, your rights and complaints to the CNIL) is detailed in our')}{' '}
              <Link href="/confidentialite" style={{ color: 'var(--brand)' }}>{t('politique de confidentialité', 'privacy policy')}</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.cookies.titre">Cookies</EditableText></h2>
            <p>
              {t('Le site utilise uniquement des cookies strictement nécessaires : la session qui vous garde connecté·e et la mémorisation de votre langue. Aucun cookie publicitaire ou de mesure d’audience n’est utilisé.', 'The site only uses strictly necessary cookies: the session that keeps you logged in and remembering your language. No advertising or analytics cookies are used.')}
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}><EditableText id="mentions.propriete.titre">Propriété intellectuelle</EditableText></h2>
            <p>
              <EditableText id="mentions.propriete.texte" multiline>L&apos;ensemble du contenu du site (textes, visuels, structure, concept) est la propriété exclusive de YES BOX. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</EditableText>
            </p>
          </section>
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('Conditions générales de vente', 'Terms of sale')}</h2>
            <p>
              {t('Le fonctionnement du programme, les abonnements, les tarifs, le droit de rétractation et la médiation sont décrits dans nos', 'How the program works, subscriptions, prices, the right of withdrawal and mediation are described in our')}{' '}
              <Link href="/cgv" style={{ color: 'var(--brand)' }}>{t('conditions générales de vente', 'terms of sale')}</Link>.
            </p>
          </section>
          <p className="pt-4" style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="mentions.majdate.v2">Dernière mise à jour : octobre 2026</EditableText></p>
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
