import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { enregistrerPackInitial } from '@/lib/pack-initial'

export const dynamic = 'force-dynamic'

// Retour de Stripe Checkout après l'achat du pack initial : le pack est
// ouvert tout de suite si le webhook n'est pas encore passé (le premier des
// deux l'ouvre, cf. enregistrerPackInitial), puis retour à l'accueil.
export default async function MerciPackPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  if (session_id) {
    try {
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      const session = await getStripe().checkout.sessions.retrieve(session_id)
      if (profile?.couple_id && session.metadata?.couple_id === profile.couple_id) {
        await enregistrerPackInitial(createAdminClient(), session)
      }
    } catch (e) {
      console.error(`[pack initial] page de retour : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  redirect('/tableau-de-bord?pack=succes')
}
