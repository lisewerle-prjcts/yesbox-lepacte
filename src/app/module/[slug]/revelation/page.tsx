import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModuleBySlug } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { localizeModule } from '@/lib/i18n/module-text'
import RevelationClient from '@/components/module/RevelationClient'

interface PageProps { params: Promise<{ slug: string }> }

export default async function RevelationPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const locale = await getLocale()
  const moduleInfoRaw = await getEffectiveModuleBySlug(slug)
  if (!moduleInfoRaw) notFound()
  const moduleInfo = localizeModule(moduleInfoRaw, locale)

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const { data: moduleData } = await supabase.from('modules').select('*').eq('couple_id', profile.couple_id).eq('slug', slug).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  const { data: partner } = await supabase.from('profiles').select('id, prenom').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  const [{ data: mesReponses }, { data: reponsesPartner }] = await Promise.all([
    supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', user.id),
    partner ? supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', partner.id) : { data: [] },
  ])

  const [{ data: maConclusion }, { data: conclusionPartenaire }] = await Promise.all([
    supabase.from('journal_entries').select('question_slug, valeur')
      .eq('couple_id', profile.couple_id).eq('module_slug', slug).eq('user_id', user.id),
    partner
      ? supabase.from('journal_entries').select('question_slug, valeur')
          .eq('couple_id', profile.couple_id).eq('module_slug', slug).eq('user_id', partner.id)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <RevelationClient
      moduleInfo={moduleInfo}
      moduleData={moduleData}
      mesReponses={mesReponses || []}
      reponsesPartner={reponsesPartner || []}
      myName={profile.prenom}
      partnerName={partner?.prenom || null}
      coupleId={profile.couple_id}
      maConclusion={maConclusion || []}
      conclusionPartenaire={conclusionPartenaire || []}
    />
  )
}
