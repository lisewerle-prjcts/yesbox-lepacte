import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ABONNEMENT_COLONNES } from '@/types'
import { aAccesComplet, estCompteResilie } from '@/lib/abonnement'
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

  // Pacte signé (parcours initial terminé) : c'est le rendez-vous annuel qui
  // est proposé, plus l'abonnement mensuel.
  const { data: signature } = await supabase.from('couples').select('pacte_signe_le').eq('id', profile.couple_id).maybeSingle()
  if (signature?.pacte_signe_le && !estCompteResilie(couple)) return <OffreRdvAnnuel mensuelEnCours={false} />

  return <AbonnementClient compteResilie={estCompteResilie(couple)} />
}
