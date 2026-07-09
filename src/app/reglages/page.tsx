import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import ReglagesForm from '@/components/ReglagesForm'
import SecuriteForm from '@/components/SecuriteForm'

export const dynamic = 'force-dynamic'

export default async function ReglagesPage() {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  const { db: supabase, profile, isImpersonating } = session

  let couple: { nom_couple: string | null; date_anniversaire: string | null } | null = null
  let partner: { prenom: string | null; email: string } | null = null

  if (profile.couple_id) {
    const [{ data: coup }, { data: part }] = await Promise.all([
      supabase.from('couples').select('nom_couple, date_anniversaire').eq('id', profile.couple_id).single(),
      supabase.from('profiles').select('prenom, email').eq('couple_id', profile.couple_id).neq('id', profile.id).single(),
    ])
    couple = coup
    partner = part
  }

  return (
    <div className="fade" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Réglages</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Ton prénom et les informations de votre espace couple.</p>
      </div>
      <ReglagesForm
        prenomInitial={profile.prenom}
        nomCoupleInitial={couple?.nom_couple ?? ''}
        dateAnniversaireInitial={couple?.date_anniversaire ?? ''}
        aCouple={!!profile.couple_id}
        partnerName={partner?.prenom || partner?.email || null}
      />
      {!isImpersonating && <SecuriteForm />}
    </div>
  )
}
