import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { chargerPersonnesSegment } from '@/lib/segments-donnees'
import AdminActionsClient from './AdminActionsClient'
import SegmentClient from './SegmentClient'

// L'envoi à un segment part e-mail par e-mail : on laisse le temps.
export const maxDuration = 300

export default async function AdminActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ couple_id?: string }>
}) {
  const { couple_id } = await searchParams
  const supabase = createAdminClient()

  const { data: couples } = await supabase.from('couples').select('id,created_at').order('created_at', { ascending: false })
  const { data: profiles } = await supabase.from('profiles').select('id,prenom,email,couple_id')
  const { data: precommandes } = await supabase.from('precommandes').select('id,prenom,email').order('created_at', { ascending: false })
  const { data: codes } = await supabase.from('codes_gratuits').select('code').order('created_at', { ascending: false })
  const effectiveModules = await getEffectiveModules()
  const personnes = await chargerPersonnesSegment(supabase)
  const modules = effectiveModules.map((m, i) => ({ slug: m.slug, name: `M${i + 1} — ${m.titre}` }))

  const couplesWithMembers = (couples || []).map(c => ({
    ...c,
    members: (profiles || []).filter(p => p.couple_id === c.id),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Actions manuelles</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Débloquer/verrouiller des modules, envoyer des emails (à une personne ou à un segment), déclencher des actions.</p>
      </div>
      <AdminActionsClient
        couples={couplesWithMembers}
        precommandes={precommandes || []}
        defaultCoupleId={couple_id}
        modules={modules}
      />
      <div className="mt-6">
        <SegmentClient
          personnes={personnes}
          codes={(codes || []).map(c => c.code)}
          modules={modules}
        />
      </div>
    </div>
  )
}
