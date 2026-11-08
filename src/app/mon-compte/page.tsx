import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getInviteLink } from '@/app/actions/couple'
import { ABONNEMENT_COLONNES, PARRAINAGE_COLONNES } from '@/types'
import type { CoupleAbonnement, CoupleParrainage } from '@/types'
import type { Filleul, CodeSaisi } from './MonCompteClient'
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
  let offreRdvAnnuelDispo = false
  let rappelsEmail = true
  let langue: 'fr' | 'en' = 'fr'
  let filleuls: Filleul[] = []
  let codesSaisis: CodeSaisi[] = []
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
    // Pacte signé, sans abonnement : l'abonnement annuel est proposé.
    offreRdvAnnuelDispo = offre.afficher && !offre.mensuelEnCours
    couple = coup
    coupleAbonnement = coupAbo
    coupleParrainage = coupParr
    pairingCode = inviteData.success ? inviteData.pairingCode ?? null : null
    paired = inviteData.success ? !!inviteData.paired : false

    // Le compte des filleuls d'un couple exige le service role : la policy
    // RLS "couple_member_select" ne donne accès qu'à sa propre ligne, pas
    // aux couples parrainés (qui sont d'autres lignes de la même table).
    // Prénoms des membres et date d'inscription de chaque couple parrainé,
    // affichés dans la carte Parrainage.
    const admin = createAdminClient()
    const { data: couplesFilleuls } = await admin.from('couples').select('id, created_at').eq('parrain_couple_id', profile.couple_id).order('created_at', { ascending: false })
    const idsFilleuls = (couplesFilleuls ?? []).map(c => c.id)
    const { data: membresFilleuls } = idsFilleuls.length
      ? await admin.from('profiles').select('couple_id, prenom, created_at').in('couple_id', idsFilleuls).order('created_at')
      : { data: [] as { couple_id: string | null; prenom: string | null; created_at: string | null }[] }
    codesSaisis = await codesDuCouple(admin, profile.couple_id, coupleParrainage?.parrain_couple_id ?? null)
    filleuls = (couplesFilleuls ?? []).map(c => ({
      prenoms: (membresFilleuls ?? []).filter(m => m.couple_id === c.id).map(m => m.prenom?.trim()).filter((p): p is string => !!p),
      inscritLe: c.created_at,
    }))
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
      offreRdvAnnuelDispo={offreRdvAnnuelDispo}
      codeParrainage={coupleParrainage?.code_parrainage ?? null}
      filleuls={filleuls}
      codesSaisis={codesSaisis}
      recompenses={coupleParrainage?.parrainages_recompenses ?? 0}
      rappelsEmail={rappelsEmail}
      langue={langue}
    />
  )
}

const euros = (centimes: number, locale: 'fr' | 'en') =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: centimes % 100 ? 2 : 0 }).format(centimes / 100)

// Codes déjà saisis par le couple (carte « Ajouter un code ») : codes
// gratuits, cartes cadeaux, codes reçus pour un avis, code de parrainage du
// couple qui l'a parrainé. Du plus récent au plus ancien.
async function codesDuCouple(admin: ReturnType<typeof createAdminClient>, coupleId: string, parrainId: string | null): Promise<CodeSaisi[]> {
  const { data: membres } = await admin.from('profiles').select('id').eq('couple_id', coupleId)
  const [{ data: gratuits }, { data: cartes }, { data: avis }, { data: parrain }] = await Promise.all([
    admin.from('codes_gratuits_utilisations').select('utilise_le, reduction_utilisee_le, codes_gratuits(code, offre, montant_centimes)').eq('couple_id', coupleId),
    admin.from('cartes_cadeaux').select('code, utilise_le').eq('utilise_par_couple_id', coupleId),
    (membres ?? []).length
      ? admin.from('avis').select('code_reduction, code_utilise_le').in('profile_id', (membres ?? []).map(m => m.id)).not('code_utilise_le', 'is', null)
      : Promise.resolve({ data: [] as { code_reduction: string | null; code_utilise_le: string | null }[] }),
    parrainId ? admin.from('couples').select('code_parrainage').eq('id', parrainId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const codes: CodeSaisi[] = []
  type CodeLie = { code: string; offre: string; montant_centimes: number | null }
  for (const u of gratuits ?? []) {
    const lie = u.codes_gratuits as CodeLie | CodeLie[] | null
    const c = Array.isArray(lie) ? lie[0] : lie
    if (!c) continue
    const detail = c.offre === 'reduction' && c.montant_centimes
      ? {
          fr: `${euros(c.montant_centimes, 'fr')} de réduction · ${u.reduction_utilisee_le ? 'déjà déduits' : 'déduits de votre prochain paiement'}`,
          en: `${euros(c.montant_centimes, 'en')} off · ${u.reduction_utilisee_le ? 'already deducted' : 'deducted from your next payment'}`,
        }
      : c.offre === 'pack_initial'
      ? { fr: 'Pack initial offert', en: 'Starter pack offered' }
      : { fr: 'Accès offert', en: 'Free access' }
    codes.push({ code: c.code, detail, le: u.utilise_le })
  }
  for (const c of cartes ?? []) codes.push({ code: c.code, detail: { fr: 'Carte cadeau', en: 'Gift card' }, le: c.utilise_le })
  for (const a of avis ?? []) {
    if (a.code_reduction) codes.push({ code: a.code_reduction, detail: { fr: '10 € de réduction (avis publié)', en: '€10 off (published review)' }, le: a.code_utilise_le })
  }
  if (parrain?.code_parrainage) codes.push({ code: parrain.code_parrainage, detail: { fr: 'Code de parrainage du couple qui vous a parrainés', en: 'Referral code of the couple who referred you' }, le: null })
  return codes.sort((a, b) => (b.le ?? '').localeCompare(a.le ?? ''))
}
