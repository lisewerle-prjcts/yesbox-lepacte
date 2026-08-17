import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminHome() {
  const supabase = createAdminClient()

  const [
    { count: totalUsers },
    { data: allCouples },
    { data: completeModules },
    { data: modulesStats },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('couples').select('id'),
    supabase.from('modules').select('couple_id').eq('statut', 'complete'),
    supabase.from('modules').select('slug,statut,revealed').order('slug'),
  ])

  const completeCountByCouple: Record<string, number> = {}
  completeModules?.forEach(m => { completeCountByCouple[m.couple_id] = (completeCountByCouple[m.couple_id] ?? 0) + 1 })
  const totalCouples = allCouples?.length ?? 0
  const couplesParcoursBac = (allCouples ?? []).filter(c => (completeCountByCouple[c.id] ?? 0) === 7).length
  const couplesParcoursInitial = totalCouples - couplesParcoursBac

  const moduleSlugs = ['moi','toi','nous','communication','conflits','engagement','renouvellement']
  const moduleNames: Record<string, string> = {
    moi: 'Moi et toi', toi: 'Toi et moi', nous: 'Nous',
    communication: 'Parlons-nous', conflits: 'Les conflits',
    engagement: 'Le Pacte', renouvellement: 'Le Renouvellement',
  }

  const statsBySlug = moduleSlugs.map(slug => {
    const rows = (modulesStats || []).filter(m => m.slug === slug)
    return {
      slug,
      name: moduleNames[slug],
      complete: rows.filter(m => m.statut === 'complete' || m.statut === 'revealed').length,
      revealed: rows.filter(m => m.revealed).length,
      total: rows.length,
    }
  })

  const STATS = [
    { label: 'Utilisateurs', value: totalUsers ?? 0, color: 'var(--ink)', href: '/admin/utilisateurs' },
    { label: 'Couples — parcours initial', value: couplesParcoursInitial, color: 'var(--brand)', href: '/admin/couples' },
    { label: 'Couples — parcours BAC', value: couplesParcoursBac, color: 'var(--sage)', href: '/admin/couples' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Vue d&apos;ensemble</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Tableau de bord administrateur YES BOX</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map(s => (
          <Link key={s.label} href={s.href} className="card p-6 hover:shadow-md transition-shadow">
            <div className="font-serif font-bold mb-1" style={{ fontSize: 40, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Stats modules */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4" style={{ fontSize: 15 }}>Avancement par module</h2>
        <div className="space-y-3">
          {statsBySlug.map(m => (
            <div key={m.slug}>
              <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--ink-2)' }}>{m.name}</span>
                <span style={{ color: 'var(--muted)' }}>{m.complete} terminés · {m.revealed} révélés / {m.total}</span>
              </div>
              <div className="progress-bar">
                <span className="progress-bar-fill" style={{ width: m.total ? `${Math.round(m.complete / m.total * 100)}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
