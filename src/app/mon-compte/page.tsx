import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getInviteLink } from '@/app/actions/couple'
import { ABONNEMENT_COLONNES, PARRAINAGE_COLONNES } from '@/types'
import type { CoupleAbonnement, CoupleParrainage } from '@/types'
import { lireFormule, offreRdvAnnuel } from '@/lib/abonnement'
import MonCompteClient from './MonCompteClient'

export default async function MonComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, email, couple_id')
    .eq('id', user.id)
    .single()

  let couple: { nom_couple: string | null } | null = null
  let coupleAbonnement: CoupleAbonnement | null = null
  let coupleParrainage: CoupleParrainage | null = null
  let formule: 'mensuel' | 'annuel' | null = null
  let annuelPrevuLe: string | null = null
  let proposerAnnuel = false
  let rappelsEmail = true
  let langue: 'fr' | 'en' = 'fr'
  let filleulsCount = 0
  let pairingCode: string | null = null
  let paired = false
  if (profile?.couple_id) {
    const [{ data: coup }, { data: coupAbo }, { data: coupParr }, inviteData, formuleLue, { data: signature }, { data: prefs }] = await Promise.all([
      supabase.from('couples').select('nom_couple').eq('id', profile.couple_id).single(),
      supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single(),
      supabase.from('couples').select(PARRAINAGE_COLONNES).eq('id', profile.couple_id).single(),
      getInviteLink(),
      lireFormule(supabase, profile.couple_id),
      supabase.from('couples').select('pacte_signe_le').eq('id', profile.couple_id).maybeSingle(),
      // Requête à part : si la colonne manque encore en base, la page s'affiche.
      supabase.from('profiles').select('rappels_email').eq('id', user.id).maybeSingle(),
    ])
    rappelsEmail = prefs?.rappels_email ?? true
    // Requête à part, comme ci-dessus.
    const { data: profilLangue } = await supabase.from('profiles').select('langue').eq('id', user.id).maybeSingle()
    langue = profilLangue?.langue === 'en' ? 'en' : 'fr'
    formule = formuleLue.formule
    annuelPrevuLe = formuleLue.annuelPrevuLe
    const offre = offreRdvAnnuel(coupAbo, formuleLue, !!signature?.pacte_signe_le)
    proposerAnnuel = offre.afficher && offre.mensuelEnCours
    couple = coup
    coupleAbonnement = coupAbo
    coupleParrainage = coupParr
    pairingCode = inviteData.success ? inviteData.pairingCode ?? null : null
    paired = inviteData.success ? !!inviteData.paired : false

    // Le compte des filleuls d'un couple exige le service role : la policy
    // RLS "couple_member_select" ne donne accès qu'à sa propre ligne, pas
    // aux couples parrainés (qui sont d'autres lignes de la même table).
    const admin = createAdminClient()
    const { count } = await admin.from('couples').select('id', { count: 'exact', head: true }).eq('parrain_couple_id', profile.couple_id)
    filleulsCount = count ?? 0
  }

  return (
    <MonCompteClient
      prenom={profile?.prenom ?? ''}
      email={profile?.email ?? user.email ?? ''}
      nomCouple={couple?.nom_couple ?? ''}
      pairingCode={pairingCode}
      paired={paired}
      abonnement={coupleAbonnement}
      formule={formule}
      annuelPrevuLe={annuelPrevuLe}
      proposerAnnuel={proposerAnnuel}
      codeParrainage={coupleParrainage?.code_parrainage ?? null}
      filleulsCount={filleulsCount}
      rappelsEmail={rappelsEmail}
      langue={langue}
    />
  )
}
