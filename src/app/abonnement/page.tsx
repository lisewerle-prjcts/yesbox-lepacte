import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ABONNEMENT_COLONNES } from '@/types'
import { estAbonnementActif, estCompteResilie } from '@/lib/abonnement'
import AbonnementClient from './AbonnementClient'

export default async function AbonnementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const { data: couple } = await supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single()

  if (estAbonnementActif(couple)) redirect('/tableau-de-bord')

  return <AbonnementClient compteResilie={estCompteResilie(couple)} />
}
