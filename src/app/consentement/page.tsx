import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { aDonneSonConsentement } from '@/lib/consentement'
import ConsentementClient from './ConsentementClient'

export const metadata = { title: 'Consentement' }

export default async function ConsentementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, age_minimum_certifie_le, consentement_donnees_sensibles_le')
    .eq('id', user.id)
    .single()
  if (aDonneSonConsentement(profile)) redirect('/tableau-de-bord')

  return <ConsentementClient prenom={profile?.prenom ?? ''} />
}
