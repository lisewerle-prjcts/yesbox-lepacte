import { createAdminClient } from '@/lib/supabase/server'
import SecuriteClient from './SecuriteClient'

export default async function AdminSecurite() {
  const supabase = createAdminClient()

  const [{ data: profiles }, { data: couples }] = await Promise.all([
    supabase.from('profiles').select('id, prenom, email, couple_id').order('email'),
    supabase.from('couples').select('id, numero'),
  ])

  const numeroByCoupleId: Record<string, number> = {}
  for (const c of couples || []) numeroByCoupleId[c.id] = c.numero

  const members = (profiles || []).map(p => ({
    id: p.id,
    prenom: p.prenom,
    email: p.email,
    coupleNumero: p.couple_id ? numeroByCoupleId[p.couple_id] ?? null : null,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Sécurité</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Envoie un nouveau mot de passe à un membre en cas d&apos;oubli. Le pairage des couples se gère depuis l&apos;onglet « Couples & progression ».
        </p>
      </div>
      <SecuriteClient members={members} />
    </div>
  )
}
