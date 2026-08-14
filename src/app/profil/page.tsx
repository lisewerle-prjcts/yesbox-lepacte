import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfilClient from './ProfilClient'

export const metadata = { title: 'Ton profil' }

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, prenom, nom, couple_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/connexion')

  let couple: { pairing_code: string | null; date_anniversaire: string | null } | null = null
  if (profile.couple_id) {
    const { data } = await supabase
      .from('couples')
      .select('pairing_code, date_anniversaire')
      .eq('id', profile.couple_id)
      .single()
    couple = data
  }

  return <ProfilClient profile={profile} couple={couple} />
}
