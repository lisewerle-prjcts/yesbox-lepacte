import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModuleBySlug } from '@/lib/modules-effective'
import RevelationClient from '@/components/module/RevelationClient'
import type { Module } from '@/types'

interface PageProps { params: Promise<{ slug: string }> }

// "moi" et "toi" sont une paire jouée en miroir (mêmes thèmes, l'un
// formulé "sur moi", l'autre "sur l'autre"). Leur reveal est donc
// croisé : le reveal "moi" compare les réponses de l'initiateur sur
// lui/elle-même à ce que le/la partenaire a deviné de lui/elle (module
// "toi"), et inversement pour le reveal "toi". Les modules 3+ gardent
// le reveal classique (même module, les deux membres du couple).
const CROSSED_SLUGS = new Set(['moi', 'toi'])

export default async function RevelationPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const moduleInfo = await getEffectiveModuleBySlug(slug)
  if (!moduleInfo) notFound()

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  if (!moduleInfo.free) {
    const { data: couple } = await supabase.from('couples').select('abonnement_actif').eq('id', profile.couple_id).single()
    if (!couple?.abonnement_actif) redirect('/abonnement-requis')
  }

  const { data: journalEntry } = await supabase
    .from('journal_entries').select('contenu').eq('couple_id', profile.couple_id).eq('module_slug', slug).single()

  if (CROSSED_SLUGS.has(slug)) {
    const [{ data: moduleRows }, { data: members }] = await Promise.all([
      supabase.from('modules').select('*').eq('couple_id', profile.couple_id).in('slug', ['moi', 'toi']),
      supabase.from('profiles').select('id, prenom, role').eq('couple_id', profile.couple_id),
    ])

    const moiRow = moduleRows?.find(m => m.slug === 'moi')
    const toiRow = moduleRows?.find(m => m.slug === 'toi')
    const initiateur = members?.find(m => m.role === 'initiateur')
    const partenaire = members?.find(m => m.role === 'partenaire')
    if (!moiRow || !toiRow || !initiateur || !partenaire) redirect('/tableau-de-bord')

    // Le reveal "moi" est toujours à propos de l'initiateur (ses réponses
    // sur "moi" vs celles du/de la partenaire sur "toi"), le reveal "toi"
    // toujours à propos du/de la partenaire — quel que soit qui consulte
    // la page : les deux membres du couple voient la même comparaison.
    const selfPerson = slug === 'moi' ? initiateur : partenaire
    const guessPerson = slug === 'moi' ? partenaire : initiateur
    const moduleData: Module = (slug === 'moi' ? moiRow : toiRow) as Module

    const total = moduleInfo.questions.length
    const [{ data: selfReponses }, { data: guessReponses }] = await Promise.all([
      supabase.from('reponses').select('*').eq('module_id', moiRow.id).eq('user_id', selfPerson.id),
      supabase.from('reponses').select('*').eq('module_id', toiRow.id).eq('user_id', guessPerson.id),
    ])

    const selfDone = (selfReponses?.length ?? 0) >= total
    const guessDone = (guessReponses?.length ?? 0) >= total
    if (moduleData.statut === 'locked' || !selfDone || !guessDone) redirect('/tableau-de-bord')

    return (
      <RevelationClient
        moduleInfo={moduleInfo}
        moduleData={moduleData}
        mesReponses={selfReponses || []}
        reponsesPartner={guessReponses || []}
        myName={selfPerson.prenom}
        partnerName={guessPerson.prenom}
        coupleId={profile.couple_id}
        journalContenu={journalEntry?.contenu || null}
        crossNote={`Réponses de ${selfPerson.prenom || 'la personne concernée'} sur ${slug === 'moi' ? 'elle-même' : 'lui/elle-même'}, face à ce que ${guessPerson.prenom || 'son/sa partenaire'} en a deviné.`}
      />
    )
  }

  const { data: moduleData } = await supabase.from('modules').select('*').eq('couple_id', profile.couple_id).eq('slug', slug).single()
  if (!moduleData || moduleData.statut === 'locked') redirect('/tableau-de-bord')

  const { data: partner } = await supabase.from('profiles').select('id, prenom').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  const [{ data: mesReponses }, { data: reponsesPartner }] = await Promise.all([
    supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', user.id),
    partner ? supabase.from('reponses').select('*').eq('module_id', moduleData.id).eq('user_id', partner.id) : { data: [] },
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
      journalContenu={journalEntry?.contenu || null}
    />
  )
}
