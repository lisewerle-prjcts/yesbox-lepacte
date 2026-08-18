import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import CouplesClient from './CouplesClient'

export default async function AdminCouples() {
  const supabase = createAdminClient()

  const [{ data: couples, error: couplesError }, { data: profiles }, effectiveModules] = await Promise.all([
    supabase.from('couples').select('id, numero, pairing_code, nom_couple, date_anniversaire, created_at').order('numero', { ascending: true }),
    supabase.from('profiles').select('id, prenom, nom, email, couple_id, role').order('email'),
    getEffectiveModules(),
  ])

  const questionCountBySlug: Record<string, number> = {}
  for (const m of effectiveModules) questionCountBySlug[m.slug] = m.questions.length
  const SLUGS = effectiveModules.map(m => m.slug)

  const coupleIds = (couples || []).map(c => c.id)

  const { data: modules } = coupleIds.length
    ? await supabase.from('modules').select('id, couple_id, slug, statut, revealed, connivence_score').in('couple_id', coupleIds)
    : { data: [] }

  const moduleIds = (modules || []).map(m => m.id)
  const { data: reponses } = moduleIds.length
    ? await supabase.from('reponses').select('module_id, user_id').in('module_id', moduleIds)
    : { data: [] }

  const allProfiles = profiles || []
  const unassigned = allProfiles.filter(p => !p.couple_id).map(p => ({ id: p.id, prenom: p.prenom, nom: p.nom, email: p.email, role: p.role }))

  const couplesData = (couples || []).map(couple => {
    const members = allProfiles.filter(p => p.couple_id === couple.id)
    const coupleModules = (modules || []).filter(m => m.couple_id === couple.id)

    const membersWithProgress = members.map(member => {
      let modulesCompleted = 0
      for (const slug of SLUGS) {
        const mod = coupleModules.find(m => m.slug === slug)
        if (!mod) continue
        const total = questionCountBySlug[slug] || 0
        const answered = (reponses || []).filter(r => r.module_id === mod.id && r.user_id === member.id).length
        if (total > 0 && answered >= total) modulesCompleted += 1
      }
      return { id: member.id, prenom: member.prenom, nom: member.nom, email: member.email, role: member.role, modulesCompleted }
    })

    return {
      id: couple.id,
      numero: couple.numero,
      pairing_code: couple.pairing_code,
      nom_couple: couple.nom_couple,
      date_anniversaire: couple.date_anniversaire,
      created_at: couple.created_at,
      members: membersWithProgress,
      modules: coupleModules.map(m => ({ slug: m.slug, statut: m.statut, revealed: m.revealed, connivence_score: m.connivence_score })),
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>Couples & progression</h1>
        <span className="tag-muted">{couplesData.length} couple{couplesData.length > 1 ? 's' : ''}</span>
      </div>
      {couplesError && (
        <div className="card p-4 mb-4" style={{ borderColor: '#dc2626', fontSize: 13, color: '#dc2626' }}>
          Erreur lors du chargement des couples : {couplesError.message}
        </div>
      )}
      <CouplesClient couples={couplesData} unassigned={unassigned} totalModules={SLUGS.length} moduleSlugs={SLUGS} />
    </div>
  )
}
