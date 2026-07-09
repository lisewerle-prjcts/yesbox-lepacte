import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { getEffectiveSession } from '@/lib/effective-session'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

interface PageProps { searchParams: Promise<{ session_id?: string }> }

export default async function PaiementSuccesPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  const { db: supabase, profile } = session
  if (!profile.couple_id) redirect('/tableau-de-bord')

  const { data: couple } = await supabase.from('couples').select('a_paye').eq('id', profile.couple_id).single()

  // Filet de sécurité si le webhook n'a pas encore (ou pas pu) traiter
  // l'évènement : on revérifie directement auprès de Stripe avec le
  // session_id de retour, pour ne jamais laisser un couple payé bloqué.
  if (!couple?.a_paye && session_id) {
    try {
      const stripe = getStripe()
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id)
      if (checkoutSession.payment_status === 'paid' && checkoutSession.metadata?.couple_id === profile.couple_id) {
        await supabase.from('couples').update({
          a_paye: true,
          paye_at: new Date().toISOString(),
          stripe_customer_id: typeof checkoutSession.customer === 'string' ? checkoutSession.customer : null,
          stripe_checkout_session_id: checkoutSession.id,
        }).eq('id', profile.couple_id)
      }
    } catch {}
  }

  return (
    <div className="fade" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--sage-soft)' }}>
        <CheckCircle className="w-8 h-8" style={{ color: 'var(--sage)' }} />
      </div>
      <h1 className="font-serif" style={{ fontSize: 30, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
        Merci, c&apos;est réglé ✦
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
        Votre accès complet est débloqué. Les 10 modules, les sessions de révélation et votre CDD de couple vous attendent.
      </p>
      <Link href="/tableau-de-bord" className="btn-brand lg">
        Retour au tableau de bord <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
