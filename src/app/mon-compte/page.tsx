import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MonCompteClient from './MonCompteClient'

export default async function MonComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom, prenom, email, couple_id, couples(nom_couple, date_anniversaire, pairing_code)')
    .eq('id', user.id)
    .single()

  let partner: { prenom: string | null; email: string } | null = null
  if (profile?.couple_id) {
    const { data: part } = await supabase
      .from('profiles')
      .select('prenom, email')
      .eq('couple_id', profile.couple_id)
      .neq('id', user.id)
      .single()
    partner = part
  }

  const couple = profile?.couples as unknown as { nom_couple: string | null; date_anniversaire: string | null; pairing_code: string | null } | null

  return (
    <MonCompteClient
      nom={profile?.nom ?? ''}
      prenom={profile?.prenom ?? ''}
      email={profile?.email ?? user.email ?? ''}
      partnerPrenom={partner?.prenom ?? ''}
      hasPartner={!!partner}
      nomCouple={couple?.nom_couple ?? ''}
      dateAnniversaire={couple?.date_anniversaire ?? ''}
      pairingCode={couple?.pairing_code ?? ''}
    />
  )
}
