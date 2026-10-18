import { createAdminClient } from '@/lib/supabase/server'
import UtilisateursClient from './UtilisateursClient'

export default async function AdminUtilisateurs() {
  const supabase = createAdminClient()

  const [{ data: profiles }, { data: couples }, { data: authUsers }, { data: codes }, { data: utilisations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, nom, prenom, created_at, couple_id')
      .order('created_at', { ascending: false }),
    supabase.from('couples').select('id, numero'),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('codes_gratuits').select('code, usages, usages_max').eq('actif', true).order('created_at', { ascending: false }),
    supabase.from('codes_gratuits_utilisations').select('couple_id, codes_gratuits(code)'),
  ])

  const codeParCouple: Record<string, string> = {}
  for (const u of utilisations || []) {
    const lie = u.codes_gratuits as { code?: string } | { code?: string }[] | null
    const code = Array.isArray(lie) ? lie[0]?.code : lie?.code
    if (code) codeParCouple[u.couple_id] = code
  }

  const confirmeById: Record<string, boolean> = {}
  for (const u of authUsers?.users || []) confirmeById[u.id] = !!u.email_confirmed_at

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
    emailConfirme: confirmeById[p.id] ?? true,
    code: p.couple_id ? codeParCouple[p.couple_id] ?? null : null,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Utilisateurs</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          {users.length} utilisateur{users.length > 1 ? 's' : ''} inscrit{users.length > 1 ? 's' : ''}.
        </p>
      </div>
      <UtilisateursClient
        users={users}
        codesDisponibles={(codes || []).map(c => ({ code: c.code, restants: c.usages_max - c.usages }))}
      />
    </div>
  )
}
