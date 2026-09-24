import { redirect, notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { moduleDuCouple, etatReponses } from '@/lib/progression'
import { getEffectiveModuleBySlug } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { localizeModule } from '@/lib/i18n/module-text'
import RevelationClient from '@/components/module/RevelationClient'
import { peutAccederModule } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'
import type { Reponse } from '@/types'

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

  if (!moduleInfo.free) {
    const { data: couple } = await supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single()
    if (!peutAccederModule(moduleInfo, moduleData, couple)) redirect('/abonnement')
  }

  // Tout est calculé côté serveur : les réponses de l'autre ne sont envoyées
  // au navigateur qu'une fois que les deux ont répondu à tout, et sa
  // conclusion jamais (seulement si elle est écrite ou non).
  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleData.id)
  if (!mod) redirect('/tableau-de-bord')
  const etat = await etatReponses<Reponse>(admin, mod, user.id, moduleInfo.questions)
  const partner = etat.partenaire

  const [{ data: maConclusion }, { data: conclusionPartenaire }] = await Promise.all([
    supabase.from('journal_entries').select('question_slug, valeur')
      .eq('couple_id', profile.couple_id).eq('module_slug', slug).eq('user_id', user.id),
    partner
      ? admin.from('journal_entries').select('question_slug, valeur')
          .eq('couple_id', profile.couple_id).eq('module_slug', slug).eq('user_id', partner.id)
      : Promise.resolve({ data: [] as { question_slug: string; valeur: string | null }[] }),
  ])
  const partenaireConclusionFaite = ['apprentissage', 'surprise'].every(q =>
    (conclusionPartenaire ?? []).some(c => c.question_slug === q && c.valeur?.trim())
  )

  return (
    <RevelationClient
      moduleInfo={moduleInfo}
      moduleData={moduleData}
      mesReponses={etat.mesReponses}
      reponsesPartner={etat.reponsesPartenaire}
      reponsesPartagees={etat.reponsesPartagees}
      myName={profile.prenom}
      partnerName={partner?.prenom || null}
      coupleId={profile.couple_id}
      maConclusion={maConclusion || []}
      partenaireConclusionFaite={partenaireConclusionFaite}
    />
  )
}
