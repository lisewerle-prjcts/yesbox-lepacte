import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import CouplesClient from './CouplesClient'
import PrecommandesManager from './PrecommandesManager'

const SLUGS = ['moi', 'toi', 'nous', 'communication', 'conflits', 'engagement', 'renouvellement']

export default async function AdminCouples() {
  const supabase = createAdminClient()

  const { data: precommandes, error: precommandesError } = await supabase
    .from('precommandes')
    .select('id,prenom,nom,email,adresse,message,partenaire_prenom,couple_code,paired_with,created_at')
    .order('created_at', { ascending: false })

  const [{ data: couples, error: couplesError }, { data: profiles }, effectiveModules] = await Promise.all([
    supabase.from('couples').select('id, numero, pairing_code, nom_couple, date_anniversaire, created_at').order('numero', { ascending: true }),
    supabase.from('profiles').select('id, prenom, email, couple_id, role').order('email'),
    getEffectiveModules(),
  ])

  const questionCountBySlug: Record<string, number> = {}
  for (const m of effectiveModules) questionCountBySlug[m.slug] = m.questions.length

  const coupleIds = (couples || []).map(c => c.id)

  const { data: modules } = coupleIds.length
    ? await supabase.from('modules').select('id, couple_id, slug, statut, revealed, connivence_score').in('couple_id', coupleIds)
    : { data: [] }

  const moduleIds = (modules || []).map(m => m.id)
  const { data: reponses } = moduleIds.length
    ? await supabase.from('reponses').select('module_id, user_id').in('module_id', moduleIds)
    : { data: [] }

  const allProfiles = profiles || []
  const unassigned = allProfiles.filter(p => !p.couple_id).map(p => ({ id: p.id, prenom: p.prenom, email: p.email, role: p.role }))

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
      return { id: member.id, prenom: member.prenom, email: member.email, role: member.role, modulesCompleted }
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>Couples & progression</h1>
          <span className="tag-muted">{(precommandes || []).length} inscription{(precommandes || []).length > 1 ? 's' : ''}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Gère les inscriptions pré-lancement : codes couple, appairage, corrections, suppressions.</p>
      </div>

      {(precommandesError || couplesError) && (
        <div className="alert-error mb-4">
          Erreur de lecture en base : {precommandesError?.message || couplesError?.message}.
          {' '}Si tu viens de mettre à jour l&apos;app, il faut d&apos;abord exécuter la migration SQL
          (<code>supabase/schema.sql</code>) sur le projet Supabase — les nouvelles colonnes
          (<code>nom</code>, <code>couple_code</code>, etc.) n&apos;existent probablement pas encore en base.
        </div>
      )}

      <PrecommandesManager precommandes={precommandes || []} />

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--ink)' }}>Couples actifs</h2>
          <span className="tag-muted">{couplesData.length} couple{couplesData.length > 1 ? 's' : ''}</span>
        </div>
        <CouplesClient couples={couplesData} unassigned={unassigned} totalModules={SLUGS.length} />
      </div>
    </div>
  )
}
