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

  const { data: profile } = await supabase.from('profiles').select('couple_id, role').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  // "moi"/"toi" sont une paire jouée en miroir, mais dans un ORDRE
  // PERSONNEL par rôle : chacun commence par son propre module (gratuit,
  // auto-décrit) et ne débloque le second (payant, sur le/la partenaire)
  // qu'une fois le sien terminé. Le statut couple-level "locked" ne
  // suffit pas ici — les deux modules restent "en_cours" pour le couple
  // en même temps, seul l'ordre PERSONNEL de chacun verrouille le second.
  if (slug === 'moi' || slug === 'toi') {
    const myOrder: [string, string] = profile.role === 'partenaire' ? ['toi', 'moi'] : ['moi', 'toi']
    if (slug === myOrder[1]) {
      const firstSlug = myOrder[0]
      const firstModuleInfo = await getEffectiveModuleBySlug(firstSlug)
      const { data: firstModuleRow } = await supabase.from('modules').select('id').eq('couple_id', profile.couple_id).eq('slug', firstSlug).single()
      const { count } = firstModuleRow
        ? await supabase.from('reponses').select('id', { count: 'exact', head: true }).eq('module_id', firstModuleRow.id).eq('user_id', user.id)
        : { count: 0 }
      const iFinishedFirst = !!firstModuleInfo && (count ?? 0) >= firstModuleInfo.questions.length
      if (!iFinishedFirst) redirect(`/module/${firstSlug}`)
    }
  }

  // "moi"/"toi" sont une paire jouée en miroir : seul le module 1 est
  // gratuit, mais côté réponses ça se traduit par rôle, pas par slug —
  // le reveal gratuit (à propos de l'initiateur) a besoin des réponses
  // de l'initiateur sur "moi" ET de celles du/de la partenaire sur
  // "toi" (qui le/la décrit). Répondre "pour l'autre" côté initiateur
  // (sur "toi") ou "pour soi" côté partenaire (sur "moi") alimente le
  // reveal miroir, payant.
  const freeForThisUser = slug === 'moi' ? profile.role === 'initiateur'
    : slug === 'toi' ? profile.role === 'partenaire'
    : moduleInfo.free

  if (!freeForThisUser) {
    const { data: couple } = await supabase.from('couples').select('abonnement_actif').eq('id', profile.couple_id).single()
    if (!couple?.abonnement_actif) redirect('/abonnement-requis')
  }

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
