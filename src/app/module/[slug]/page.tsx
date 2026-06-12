import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getModuleBySlug } from '@/lib/modules-data'
import ModuleQuestions from '@/components/module/ModuleQuestions'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const moduleInfo = getModuleBySlug(slug)
  if (!moduleInfo) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, role')
    .eq('id', user.id)
    .single()

  // Si pas de couple, on crée un couple temporaire pour permettre l'exploration
  let coupleId = profile?.couple_id
  if (!coupleId) redirect('/inviter-partenaire')

  const { data: moduleData } = await supabase
    .from('modules')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('slug', slug)
    .single()

  if (!moduleData || moduleData.statut === 'locked') {
    redirect('/tableau-de-bord')
  }

  const { data: mesReponses } = await supabase
    .from('reponses')
    .select('*')
    .eq('module_id', moduleData.id)
    .eq('user_id', user.id)

  const { data: reponsesPartenaire } = await supabase
    .from('reponses')
    .select('*')
    .eq('module_id', moduleData.id)
    .neq('user_id', user.id)

  return (
    <ModuleQuestions
      moduleInfo={moduleInfo}
      moduleData={moduleData}
      mesReponses={mesReponses || []}
      reponsesPartenaire={reponsesPartenaire || []}
      userId={user.id}
    />
  )
}
