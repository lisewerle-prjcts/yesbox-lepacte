import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ABONNEMENT_COLONNES } from '@/types'
import { aAccesComplet, aDejaEuLaYesBox, estCompteResilie } from '@/lib/abonnement'
import OffreRdvAnnuel from '@/components/OffreRdvAnnuel'
import AbonnementClient from './AbonnementClient'

export default async function AbonnementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const { data: couple } = await supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single()

  if (aAccesComplet(couple)) redirect('/tableau-de-bord')

  // YES BOX déjà obtenue (pacte signé, première année achetée ou offerte
  // terminée) : c'est le renouvellement à 19 €/an qui est proposé, plus les
  // 58 €. Lecture admin : les cartes cadeaux ne sont pas lisibles par le couple.
  if (!estCompteResilie(couple) && await aDejaEuLaYesBox(createAdminClient(), profile.couple_id)) {
    return <OffreRdvAnnuel mensuelEnCours={false} finPeriode={null} />
  }

  return <AbonnementClient compteResilie={estCompteResilie(couple)} />
}
