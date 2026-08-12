import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfilClient from './ProfilClient'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, nom, email, couple_id')
    .eq('id', user.id)
    .single()

  let couple: { pairing_code: string | null; date_anniversaire: string | null } | null = null
  let partner: { prenom: string | null; email: string } | null = null

  if (profile?.couple_id) {
    const [{ data: coup }, { data: part }] = await Promise.all([
      supabase.from('couples').select('pairing_code, date_anniversaire').eq('id', profile.couple_id).single(),
      supabase.from('profiles').select('prenom, email').eq('couple_id', profile.couple_id).neq('id', user.id).maybeSingle(),
    ])
    couple = coup
    partner = part
  }

  return (
    <div className="fade" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          Mon profil
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Tes infos, ton code de pairage, ton binôme et votre date de couple.
        </p>
      </div>

      <ProfilClient profile={profile} couple={couple} partner={partner} />
    </div>
  )
}
