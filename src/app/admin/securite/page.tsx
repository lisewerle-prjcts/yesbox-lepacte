import { createClient, createAdminClient } from '@/lib/supabase/server'
import SecuriteForm from '@/components/SecuriteForm'
import { adminToggleAdminAccess } from '@/app/actions/admin'
import { ShieldCheck, ShieldOff } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSecuritePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const [{ data: authUsers }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from('profiles').select('id, prenom, email, is_admin, couple_id, created_at'),
  ])

  const lignes = (profiles || []).map(p => {
    const authUser = authUsers?.users.find(u => u.id === p.id)
    return { ...p, derniereConnexion: authUser?.last_sign_in_at ?? null }
  }).sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>Sécurité</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Ton compte admin, et la liste des accès sur la plateforme.</p>
      </div>

      <SecuriteForm />

      <div className="card p-6 mt-6">
        <h2 className="font-serif font-bold mb-1" style={{ fontSize: 17, color: 'var(--ink)' }}>Comptes & accès admin</h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
          {lignes.length} compte{lignes.length > 1 ? 's' : ''} inscrit{lignes.length > 1 ? 's' : ''}. Pour le détail des sessions actives par appareil, utilise le tableau de bord Supabase (Authentication → Users).
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase' }}>Compte</th>
                <th style={{ padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase' }}>Rôle</th>
                <th style={{ padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase' }}>Dernière connexion</th>
                <th style={{ padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase' }}>Créé le</th>
                <th style={{ padding: '8px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => {
                async function toggleAdmin() {
                  'use server'
                  await adminToggleAdminAccess(l.id, !l.is_admin)
                }
                return (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 500 }}>{l.prenom || '—'}</div>
                    <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{l.email}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {l.is_admin
                      ? <span className="tag-brand" style={{ fontSize: 11 }}><ShieldCheck className="w-3 h-3" />Admin</span>
                      : <span className="tag-muted" style={{ fontSize: 11 }}>Couple</span>}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>
                    {l.derniereConnexion ? new Date(l.derniereConnexion).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>
                    {l.created_at ? new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {l.id === user?.id ? (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Toi</span>
                    ) : (
                      <form action={toggleAdmin}>
                        <button type="submit" className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ml-auto"
                          style={l.is_admin
                            ? { background: 'none', border: '1px solid #fca5a5', color: '#dc2626' }
                            : { background: 'var(--brand-tint)', color: 'var(--brand)', border: '1px solid var(--brand-soft)' }}>
                          {l.is_admin ? <><ShieldOff className="w-3 h-3" />Retirer l&apos;accès admin</> : <><ShieldCheck className="w-3 h-3" />Rendre admin</>}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
