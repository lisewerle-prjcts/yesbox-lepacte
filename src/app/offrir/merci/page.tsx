import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { enregistrerCarteCadeau, formaterDateCarte, type CarteCadeau } from '@/lib/cartes-cadeaux'
import { getLocale, getT } from '@/lib/i18n/server'
import YesBoxLogo from '@/components/YesBoxLogo'
import CopierCode from './CopierCode'

export const metadata: Metadata = {
  title: 'Merci pour votre cadeau',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Retour de Stripe Checkout après l'achat d'une carte cadeau. La carte est
// créée ici si le webhook ne l'a pas encore fait (enregistrerCarteCadeau ne
// la crée qu'une fois).
export default async function MerciPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const locale = await getLocale()
  const t = getT(locale)
  const { session_id: sessionId } = await searchParams

  let carte: CarteCadeau | null = null
  let erreur = ''
  if (sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId)
      carte = await enregistrerCarteCadeau(createAdminClient(), session)
      if (!carte) erreur = t('Le paiement n’est pas encore confirmé. Vous recevrez votre code par e-mail dès sa confirmation.', 'Payment is not confirmed yet. You will receive your code by email as soon as it is.')
    } catch (e) {
      console.error(`[carte cadeau] page de remerciement : ${e instanceof Error ? e.message : String(e)}`)
      erreur = t('Nous n’avons pas pu afficher votre code. Pas d’inquiétude : il vous est envoyé par e-mail. Sinon, écrivez-nous à lise.yesbox@gmail.com.', 'We could not display your code. Don’t worry: it is being sent to you by email. Otherwise, write to us at lise.yesbox@gmail.com.')
    }
  } else {
    erreur = t('Lien incomplet.', 'Incomplete link.')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <header className="border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center"><YesBoxLogo size="sm" /></div>
      </header>
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="eyebrow justify-center mb-3">{t('Carte cadeau', 'Gift card')}</div>
        <h1 className="font-serif text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>{t('Merci pour ce beau cadeau !', 'Thank you for this lovely gift!')}</h1>

        {carte ? (
          <>
            <p className="mb-6" style={{ color: 'var(--muted)', fontSize: 15 }}>
              {t(`${carte.duree_mois} mois d’abonnement au programme YES BOX – Le Pacte. Voici votre code, également envoyé par e-mail${carte.acheteur_email ? ` à ${carte.acheteur_email}` : ''} :`,
                `${carte.duree_mois} month${carte.duree_mois > 1 ? 's' : ''} of subscription to the YES BOX – Le Pacte program. Here is your code, also sent by email${carte.acheteur_email ? ` to ${carte.acheteur_email}` : ''}:`)}
            </p>
            <CopierCode code={carte.code} />
            <p className="mt-4 mb-8" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {t(`Valable jusqu’au ${formaterDateCarte(carte.expire_le, locale)}, pour un seul couple.`, `Valid until ${formaterDateCarte(carte.expire_le, locale)}, for one couple.`)}
            </p>
            <p className="mb-6" style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>
              {carte.pour_soi
                ? t('Pour en profiter, saisissez ce code dans Mon compte, rubrique « Ajouter un code » (ou lors de votre inscription si vous n’avez pas encore de compte).', 'To use it, enter this code in My Account, under "Add a code" (or when you sign up if you don’t have an account yet).')
                : t('Transmettez ce code au couple à qui vous l’offrez : il le saisit lors de son inscription sur yesbox-lepacte.fr, ou plus tard dans Mon compte.', 'Pass this code on to the couple you’re giving it to: they enter it when signing up at yesbox-lepacte.fr, or later in My Account.')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href={`/offrir/carte/${carte.code}`} className="btn-brand">{t('Télécharger la carte à imprimer', 'Download the printable card')}</Link>
              {carte.pour_soi && <Link href="/mon-compte" className="btn-ghost">{t('Activer dans Mon compte', 'Activate in My Account')}</Link>}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>{erreur}</p>
        )}
      </main>
    </div>
  )
}
