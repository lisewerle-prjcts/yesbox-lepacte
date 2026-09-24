import { redirect, notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { moduleDuCouple, etatReponses } from '@/lib/progression'
import { getEffectiveModuleBySlug } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { localizeModule } from '@/lib/i18n/module-text'
import ModuleQuestions from '@/components/module/ModuleQuestions'
import { peutAccederModule } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'
import type { Reponse } from '@/types'

interface PageProps { params: Promise<{ slug: string }> }

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const locale = await getLocale()
  const moduleInfoRaw = await getEffectiveModuleBySlug(slug)
  if (!moduleInfoRaw) notFound()
  const moduleInfo = localizeModule(moduleInfoRaw, locale)

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const { data: moduleData } = await supabase.from('modules').select('*').eq('couple_id', profile.couple_id).eq('slug', slug).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  if (!moduleInfo.free) {
    const { data: couple } = await supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single()
    if (!peutAccederModule(moduleInfo, moduleData, couple)) redirect('/abonnement')
  }

  // Seul l'avancement de l'autre est envoyé au navigateur, jamais ses réponses.
  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleData.id)
  if (!mod) redirect('/tableau-de-bord')
  const etat = await etatReponses<Reponse>(admin, mod, user.id, moduleInfo.questions)

  return (
    <ModuleQuestions
      moduleInfo={moduleInfo}
      moduleData={moduleData}
      mesReponses={etat.mesReponses}
      partenaireTermine={etat.partenaireTermine}
      partenaireACommence={etat.partenaireACommence}
      reponsesVerrouillees={etat.reponsesPartagees}
      userId={user.id}
      partnerName={etat.partenaire?.prenom || null}
    />
  )
}
