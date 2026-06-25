import { createClient } from '@/lib/supabase/server'
import AdminActionsClient from './AdminActionsClient'

export default async function AdminActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ couple_id?: string }>
}) {
  const { couple_id } = await searchParams
  const supabase = await createClient()

  const { data: couples } = await supabase.from('couples').select('id,created_at').order('created_at', { ascending: false })
  const { data: profiles } = await supabase.from('profiles').select('id,prenom,email,couple_id')
  const { data: precommandes } = await supabase.from('precommandes').select('id,prenom,email').order('created_at', { ascending: false })

  const couplesWithMembers = (couples || []).map(c => ({
    ...c,
    members: (profiles || []).filter(p => p.couple_id === c.id),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Actions manuelles</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Débloquer/verrouiller des modules, envoyer des emails, déclencher des actions.</p>
      </div>
      <AdminActionsClient
        couples={couplesWithMembers}
        precommandes={precommandes || []}
        defaultCoupleId={couple_id}
      />
    </div>
  )
}
