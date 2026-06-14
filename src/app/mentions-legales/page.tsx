import type { Metadata } from 'next'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales et politique de confidentialité de YES BOX — Le Pacte.',
  robots: { index: false, follow: false },
}

export default function MentionsLegales() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <Link href="/" className="btn-ghost text-sm py-2 px-4">← Retour</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="eyebrow mb-4">Légal</div>
        <h1 className="font-serif text-4xl font-bold mb-10" style={{ color: 'var(--ink)' }}>Mentions légales</h1>

        <div className="space-y-10" style={{ color: 'var(--ink-2)', lineHeight: 1.8, fontSize: 14.5 }}>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Éditeur du site</h2>
            <p>Le site <strong>yesbox-lepacte.fr</strong> est édité par :</p>
            <ul className="mt-2 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>Nom : YES BOX</li>
              <li>Adresse e-mail : <a href="mailto:contact@yesbox-lepacte.fr" style={{ color: 'var(--brand)' }}>contact@yesbox-lepacte.fr</a></li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <ul className="mt-2 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>Vercel Inc. — 340 Pine Street, Suite 700, San Francisco, CA 94104, USA</li>
              <li>Supabase Inc. (base de données) — 970 Toa Payoh North, Singapour</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Données personnelles</h2>
            <p>
              Dans le cadre de l&apos;utilisation du site YES BOX, nous collectons uniquement les données nécessaires au fonctionnement du service :
            </p>
            <ul className="mt-3 space-y-1 ml-4 list-disc" style={{ color: 'var(--muted)' }}>
              <li>Adresse e-mail (compte utilisateur)</li>
              <li>Prénom (personnalisation)</li>
              <li>Réponses aux modules (stockées de façon privée, accessibles au couple uniquement)</li>
              <li>Informations de pré-commande (nom, e-mail, adresse optionnelle)</li>
            </ul>
            <p className="mt-4">
              Ces données sont stockées sur des serveurs sécurisés (Supabase). Elles ne sont ni vendues, ni transmises à des tiers. Chaque couple dispose d&apos;un espace isolé et privé, protégé par des règles d&apos;accès strictes (Row Level Security).
            </p>
            <p className="mt-3">
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Pour exercer ce droit, contactez-nous à <a href="mailto:contact@yesbox-lepacte.fr" style={{ color: 'var(--brand)' }}>contact@yesbox-lepacte.fr</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Cookies</h2>
            <p>
              Le site utilise uniquement un cookie de session pour maintenir votre connexion. Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site (textes, visuels, structure, concept) est la propriété exclusive de YES BOX. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Responsabilité</h2>
            <p>
              YES BOX est un programme d&apos;accompagnement pour couples et ne constitue en aucun cas une thérapie de couple, un conseil juridique ou une médiation professionnelle. L&apos;utilisateur reste seul responsable de l&apos;usage qu&apos;il fait du programme.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 20, color: 'var(--ink)' }}>Contact</h2>
            <p>
              Pour toute question : <a href="mailto:contact@yesbox-lepacte.fr" style={{ color: 'var(--brand)' }}>contact@yesbox-lepacte.fr</a>
            </p>
          </section>

          <p className="pt-4" style={{ fontSize: 12, color: 'var(--muted)' }}>Dernière mise à jour : juin 2026</p>
        </div>
      </main>

      <footer className="py-8 mt-10" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 text-center" style={{ fontSize: 12, color: 'var(--muted)' }}>
          © 2026 YES BOX · <Link href="/" style={{ color: 'var(--brand)' }}>yesbox-lepacte.fr</Link>
        </div>
      </footer>
    </div>
  )
}
