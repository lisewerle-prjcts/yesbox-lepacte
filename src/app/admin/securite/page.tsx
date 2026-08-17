import { createClient } from '@/lib/supabase/server'
import { listerSessions, compterCodesSecours } from '@/app/actions/security'
import CompteSecuriteClient from './CompteSecuriteClient'

export default async function AdminSecurite() {
  const selfSupabase = await createClient()
  const { data: { user } } = await selfSupabase.auth.getUser()
  const [{ data: recoverySetting }, { data: mfaFactors }, sessionsResult, codesResult] = await Promise.all([
    selfSupabase.from('settings').select('value').eq('key', `admin_recovery_email::${user?.id}`).single(),
    selfSupabase.auth.mfa.listFactors(),
    listerSessions(),
    compterCodesSecours(),
  ])
  const sessions = 'sessions' in sessionsResult ? sessionsResult.sessions : []
  const recoveryCodesCount = 'count' in codesResult ? codesResult.count : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Sécurité</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Gère la sécurité de ton propre compte admin. La réinitialisation de mot de passe des utilisateurs se gère depuis l&apos;onglet « Utilisateurs ».
        </p>
      </div>
      <div className="space-y-6">
        <CompteSecuriteClient
          email={user?.email ?? ''}
          recoveryEmail={recoverySetting?.value ?? ''}
          mfaFactors={(mfaFactors?.totp ?? []).filter(f => f.status === 'verified').map(f => ({ id: f.id, friendlyName: f.friendly_name ?? 'Application d\'authentification' }))}
          sessions={(sessions ?? []).map((s: { id: string; created_at: string; updated_at: string; user_agent: string | null; ip: string | null; is_current: boolean }) => ({
            id: s.id, createdAt: s.created_at, updatedAt: s.updated_at, userAgent: s.user_agent, ip: s.ip, isCurrent: s.is_current,
          }))}
          recoveryCodesCount={recoveryCodesCount ?? 0}
        />
      </div>
    </div>
  )
}
