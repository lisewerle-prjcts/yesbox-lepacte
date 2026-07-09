import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  const supabase = createAdminClient()

  const [
    { count: totalPrecommandes },
    { count: totalCouples },
    { count: totalUsers },
    { data: recentPrecommandes },
    { data: modulesStats },
  ] = await Promise.all([
    supabase.from('precommandes').select('*', { count: 'exact', head: true }),
    supabase.from('couples').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('precommandes').select('prenom,email,adresse,message,created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('modules').select('slug,statut,revealed').order('slug'),
  ])

  const moduleSlugs = ['partenaire1','partenaire2','couple','quotidien','projets','famille','communication','disputes','cdd','bac']
  const moduleNames: Record<string, string> = {
    partenaire1: 'Partenaire 1', partenaire2: 'Partenaire 2', couple: 'Notre couple',
    quotidien: 'Notre quotidien', projets: 'Nos projets', famille: 'La famille',
    communication: 'Nos modes de communication', disputes: 'Nos disputes',
    cdd: 'Notre CDD de couple', bac: 'Le BAC love',
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
    { label: 'Pré-commandes', value: totalPrecommandes ?? 0, color: 'var(--brand)', href: '/admin/couples' },
    { label: 'Couples inscrits', value: totalCouples ?? 0, color: 'var(--sage)', href: '/admin/couples' },
    { label: 'Utilisateurs', value: totalUsers ?? 0, color: 'var(--ink)', href: '/admin/couples' },
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Dernières pré-commandes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ fontSize: 15 }}>Dernières pré-commandes</h2>
            <span className="tag-brand">{totalPrecommandes ?? 0} total</span>
          </div>
          {recentPrecommandes?.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune pré-commande pour l&apos;instant.</p>}
          <div className="space-y-3">
            {recentPrecommandes?.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <div>
                  <div className="font-medium">{p.prenom}</div>
                  <div style={{ color: 'var(--brand)' }}>{p.email}</div>
                  {p.adresse && <div style={{ color: 'var(--muted)' }}>{p.adresse}</div>}
                  {p.message && <div style={{ color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>&ldquo;{p.message}&rdquo;</div>}
                </div>
                <div className="font-mono flex-shrink-0" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  )
}
