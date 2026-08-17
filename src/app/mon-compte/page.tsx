import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MonCompteClient from './MonCompteClient'

export default async function MonComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom, prenom, email, couple_id')
    .eq('id', user.id)
    .single()

  let couple: { nom_couple: string | null } | null = null
  if (profile?.couple_id) {
    const { data: coup } = await supabase.from('couples').select('nom_couple').eq('id', profile.couple_id).single()
    couple = coup
  }

  return (
    <MonCompteClient
      nom={profile?.nom ?? ''}
      prenom={profile?.prenom ?? ''}
      email={profile?.email ?? user.email ?? ''}
      nomCouple={couple?.nom_couple ?? ''}
    />
  )
}
