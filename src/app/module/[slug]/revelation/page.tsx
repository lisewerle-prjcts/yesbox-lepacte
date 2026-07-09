import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getModuleBySlug, moduleTitre } from '@/lib/modules-data'
import RevelationClient from '@/components/module/RevelationClient'

interface PageProps { params: Promise<{ slug: string }> }

export default async function RevelationPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const moduleInfo = getModuleBySlug(slug)
  if (!moduleInfo) notFound()

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom, role').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const { data: moduleData } = await supabase
    .from('modules').select('*')
    .eq('couple_id', profile.couple_id).eq('slug', slug)
    .order('cycle', { ascending: false }).limit(1).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  const { data: partner } = await supabase.from('profiles').select('id, prenom, role').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  const prenomInitiateur = profile.role === 'initiateur' ? profile.prenom : partner?.prenom ?? null
  const prenomPartenaire = profile.role === 'partenaire' ? profile.prenom : partner?.prenom ?? null
  const titre = moduleTitre(moduleInfo, prenomInitiateur, prenomPartenaire)

  const [{ data: mesReponses }, { data: reponsesPartner }, { data: scores }, { data: journalEntry }, { data: cyclesPrecedents }] = await Promise.all([
    supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', user.id),
    partner ? supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', partner.id) : Promise.resolve({ data: [] }),
    supabase.from('scores').select('*').eq('module_id', moduleData.id),
    supabase.from('journal_entries').select('contenu').eq('couple_id', profile.couple_id).eq('module_slug', slug).single(),
    supabase.from('modules').select('cycle, revealed_at, id')
      .eq('couple_id', profile.couple_id).eq('slug', slug)
      .lt('cycle', moduleData.cycle).eq('revealed', true)
      .order('cycle', { ascending: false }),
  ])

  const myScore = scores?.find(s => s.user_id === user.id)?.score ?? null
  const partnerScore = partner ? scores?.find(s => s.user_id === partner.id)?.score ?? null : null

  let historique: { cycle: number; revealedAt: string | null; myScore: number | null; partnerScore: number | null }[] = []
  if (cyclesPrecedents && cyclesPrecedents.length > 0) {
    const ids = cyclesPrecedents.map(c => c.id)
    const { data: scoresHistorique } = await supabase.from('scores').select('*').in('module_id', ids)
    historique = cyclesPrecedents.map(c => ({
      cycle: c.cycle,
      revealedAt: c.revealed_at,
      myScore: scoresHistorique?.find(s => s.module_id === c.id && s.user_id === user.id)?.score ?? null,
      partnerScore: partner ? scoresHistorique?.find(s => s.module_id === c.id && s.user_id === partner.id)?.score ?? null : null,
    }))
  }

  return (
    <RevelationClient
      moduleInfo={moduleInfo}
      titre={titre}
      moduleData={moduleData}
      mesReponses={mesReponses || []}
      reponsesPartner={reponsesPartner || []}
      myScore={myScore}
      partnerScore={partnerScore}
      myName={profile.prenom}
      partnerName={partner?.prenom || null}
      role={profile.role}
      coupleId={profile.couple_id}
      journalContenu={journalEntry?.contenu || null}
      historique={historique}
    />
  )
}
