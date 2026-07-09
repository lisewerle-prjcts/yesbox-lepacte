import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getModuleBySlug, moduleTitre } from '@/lib/modules-data'
import ModuleQuestions from '@/components/module/ModuleQuestions'

interface PageProps { params: Promise<{ slug: string }> }

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const moduleInfo = getModuleBySlug(slug)
  if (!moduleInfo) notFound()

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom, role').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/inviter-partenaire')

  const { data: moduleData } = await supabase
    .from('modules').select('*')
    .eq('couple_id', profile.couple_id).eq('slug', slug)
    .order('cycle', { ascending: false }).limit(1).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  const { data: partner } = await supabase.from('profiles').select('id, prenom, role').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  const prenomInitiateur = profile.role === 'initiateur' ? profile.prenom : partner?.prenom ?? null
  const prenomPartenaire = profile.role === 'partenaire' ? profile.prenom : partner?.prenom ?? null
  const titre = moduleTitre(moduleInfo, prenomInitiateur, prenomPartenaire)

  const [{ data: mesReponses }, { data: reponsesPartenaire }, { count: cyclesPrecedents }] = await Promise.all([
    supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', user.id),
    partner
      ? supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', partner.id)
      : Promise.resolve({ data: [] }),
    supabase.from('modules').select('id', { count: 'exact', head: true })
      .eq('couple_id', profile.couple_id).eq('slug', slug).lt('cycle', moduleData.cycle),
  ])

  return (
    <ModuleQuestions
      moduleInfo={moduleInfo}
      titre={titre}
      moduleData={moduleData}
      mesReponses={mesReponses || []}
      reponsesPartenaire={reponsesPartenaire || []}
      userId={user.id}
      role={profile.role}
      partnerName={partner?.prenom || null}
      aDesCyclesPrecedents={(cyclesPrecedents ?? 0) > 0}
    />
  )
}
