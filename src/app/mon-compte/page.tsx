import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInviteLink } from '@/app/actions/couple'
import { ABONNEMENT_COLONNES } from '@/types'
import type { CoupleAbonnement } from '@/types'
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
  let coupleAbonnement: CoupleAbonnement | null = null
  let pairingCode: string | null = null
  let paired = false
  if (profile?.couple_id) {
    const [{ data: coup }, { data: coupAbo }, inviteData] = await Promise.all([
      supabase.from('couples').select('nom_couple').eq('id', profile.couple_id).single(),
      supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single(),
      getInviteLink(),
    ])
    couple = coup
    coupleAbonnement = coupAbo
    pairingCode = inviteData.success ? inviteData.pairingCode ?? null : null
    paired = inviteData.success ? !!inviteData.paired : false
  }

  return (
    <MonCompteClient
      nom={profile?.nom ?? ''}
      prenom={profile?.prenom ?? ''}
      email={profile?.email ?? user.email ?? ''}
      nomCouple={couple?.nom_couple ?? ''}
      pairingCode={pairingCode}
      paired={paired}
      abonnement={coupleAbonnement}
    />
  )
}
