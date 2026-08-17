import { createAdminClient } from '@/lib/supabase/server'
import UtilisateursClient from './UtilisateursClient'

export default async function AdminUtilisateurs() {
  const supabase = createAdminClient()

  const [{ data: profiles }, { data: couples }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, nom, prenom, created_at, couple_id')
      .order('created_at', { ascending: false }),
    supabase.from('couples').select('id, numero'),
  ])

  const numeroByCoupleId: Record<string, number> = {}
  for (const c of couples || []) numeroByCoupleId[c.id] = c.numero

  const users = (profiles || []).map(p => ({
    id: p.id,
    email: p.email,
    nom: p.nom,
    prenom: p.prenom,
    createdAt: p.created_at,
    coupleNumero: p.couple_id ? numeroByCoupleId[p.couple_id] ?? null : null,
    hasCouple: !!p.couple_id,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Utilisateurs</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          {users.length} utilisateur{users.length > 1 ? 's' : ''} inscrit{users.length > 1 ? 's' : ''}.
        </p>
      </div>
      <UtilisateursClient users={users} />
    </div>
  )
}
