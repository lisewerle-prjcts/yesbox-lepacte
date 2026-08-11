import { createAdminClient } from '@/lib/supabase/server'
import SecuriteClient from './SecuriteClient'

export default async function AdminSecurite() {
  const supabase = createAdminClient()

  const [{ data: couples }, { data: profiles }] = await Promise.all([
    supabase.from('couples').select('id, numero, pairing_code, created_at').order('numero', { ascending: true }),
    supabase.from('profiles').select('id, prenom, email, couple_id, role').order('email'),
  ])

  const couplesWithMembers = (couples || []).map(c => ({
    ...c,
    members: (profiles || []).filter(p => p.couple_id === c.id),
  }))

  const unassigned = (profiles || []).filter(p => !p.couple_id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Sécurité</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Pairage manuel des couples par numéro et envoi de mots de passe en cas d&apos;oubli.
        </p>
      </div>
      <SecuriteClient couples={couplesWithMembers} unassigned={unassigned} />
    </div>
  )
}
