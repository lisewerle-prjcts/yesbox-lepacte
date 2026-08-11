import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModuleBySlug } from '@/lib/modules-effective'
import ModuleQuestions from '@/components/module/ModuleQuestions'

interface PageProps { params: Promise<{ slug: string }> }

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const moduleInfo = await getEffectiveModuleBySlug(slug)
  if (!moduleInfo) notFound()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/inviter-partenaire')

  const { data: moduleData } = await supabase.from('modules').select('*').eq('couple_id', profile.couple_id).eq('slug', slug).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  const { data: partner } = await supabase.from('profiles').select('id, prenom').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  const [{ data: mesReponses }, { data: reponsesPartenaire }] = await Promise.all([
    supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', user.id),
    partner
      ? supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', partner.id)
      : { data: [] },
  ])

  return (
    <ModuleQuestions
      moduleInfo={moduleInfo}
      moduleData={moduleData}
      mesReponses={mesReponses || []}
      reponsesPartenaire={reponsesPartenaire || []}
      userId={user.id}
      partnerName={partner?.prenom || null}
    />
  )
}
