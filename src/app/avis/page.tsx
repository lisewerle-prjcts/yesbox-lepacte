import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AvisClient from './AvisClient'

export const metadata: Metadata = {
  title: 'Votre avis',
  robots: { index: false },
}

export default async function AvisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const admin = createAdminClient()
  const [{ data: profile }, { data: avis }] = await Promise.all([
    supabase.from('profiles').select('prenom, couple_id').eq('id', user.id).single(),
    admin.from('avis').select('prenom, debut_mois, note, texte, statut').eq('profile_id', user.id).maybeSingle(),
  ])
  // Mois proposé par défaut : création du couple.
  const { data: couple } = profile?.couple_id
    ? await supabase.from('couples').select('created_at').eq('id', profile.couple_id).maybeSingle()
    : { data: null }

  return (
    <AvisClient
      existant={avis ? { prenom: avis.prenom, debutMois: avis.debut_mois.slice(0, 7), note: avis.note, texte: avis.texte, statut: avis.statut } : null}
      prenomParDefaut={profile?.prenom ?? ''}
      debutParDefaut={(couple?.created_at ?? new Date().toISOString()).slice(0, 7)}
    />
  )
}
