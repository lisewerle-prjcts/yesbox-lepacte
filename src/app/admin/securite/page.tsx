import { createAdminClient, createClient } from '@/lib/supabase/server'
import SecuriteClient from './SecuriteClient'
import CompteSecuriteClient from './CompteSecuriteClient'

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

  const selfSupabase = await createClient()
  const { data: { user } } = await selfSupabase.auth.getUser()
  const [{ data: recoverySetting }, { data: mfaFactors }] = await Promise.all([
    selfSupabase.from('settings').select('value').eq('key', `admin_recovery_email::${user?.id}`).single(),
    selfSupabase.auth.mfa.listFactors(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Sécurité</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Gère la sécurité de ton propre compte admin, et envoie un nouveau mot de passe à un membre en cas d&apos;oubli.
          Le pairage des couples se gère depuis l&apos;onglet « Couples & progression ».
        </p>
      </div>
      <div className="space-y-6">
        <CompteSecuriteClient
          email={user?.email ?? ''}
          recoveryEmail={recoverySetting?.value ?? ''}
          mfaFactors={(mfaFactors?.totp ?? []).filter(f => f.status === 'verified').map(f => ({ id: f.id, friendlyName: f.friendly_name ?? 'Application d\'authentification' }))}
        />
        <SecuriteClient members={members} />
      </div>
    </div>
  )
}
