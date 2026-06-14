import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getModuleBySlug } from '@/lib/modules-data'
import RevelationClient from '@/components/module/RevelationClient'

interface PageProps { params: Promise<{ slug: string }> }

export default async function RevelationPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const moduleInfo = getModuleBySlug(slug)
  if (!moduleInfo) notFound()

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const { data: moduleData } = await supabase.from('modules').select('*').eq('couple_id', profile.couple_id).eq('slug', slug).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  const { data: partner } = await supabase.from('profiles').select('id, prenom').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  const [{ data: mesReponses }, { data: reponsesPartner }] = await Promise.all([
    supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', user.id),
    partner ? supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', partner.id) : { data: [] },
  ])

  const { data: journalEntry } = await supabase
    .from('journal_entries').select('contenu').eq('couple_id', profile.couple_id).eq('module_slug', slug).single()

  return (
    <RevelationClient
      moduleInfo={moduleInfo}
      moduleData={moduleData}
      mesReponses={mesReponses || []}
      reponsesPartner={reponsesPartner || []}
      myName={profile.prenom}
      partnerName={partner?.prenom || null}
      coupleId={profile.couple_id}
      journalContenu={journalEntry?.contenu || null}
    />
  )
}
