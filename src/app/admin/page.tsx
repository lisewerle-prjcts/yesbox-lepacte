import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { modulesTerminesParCouple, programmeInitialTermine } from '@/lib/segments-donnees'
import Link from 'next/link'
import { tachesEmailsAnniversaire } from '@/lib/grandes-dates'
import TachesClient from './TachesClient'
import ProblemesConnexionClient from './ProblemesConnexionClient'
import { chargerProblemesConnexion } from '@/lib/problemes-connexion'

export default async function AdminHome() {
  const supabase = createAdminClient()

  const [
    { count: totalUsers },
    { data: allCouples },
    terminesParCouple,
    { data: modulesStats },
    effectiveModules,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('couples').select('id, pacte_signe_le'),
    modulesTerminesParCouple(supabase),
    supabase.from('modules').select('slug,statut,revealed').order('slug'),
    getEffectiveModules(),
  ])
  const { taches, tableManquante } = await tachesEmailsAnniversaire(supabase)
  const problemes = await chargerProblemesConnexion(supabase)

  // Parcours rendez-vous annuel : programme initial fini (les 8 modules
  // thématiques et le pacte terminés, pacte signé), comme le critère
  // « Programme initial fini » des segments.
  const totalCouples = allCouples?.length ?? 0
  const slugs = effectiveModules.map(m => m.slug)
  const couplesParcoursBac = (allCouples ?? []).filter(c => programmeInitialTermine(slugs, terminesParCouple.get(c.id) ?? {}, c.pacte_signe_le)).length
  const couplesParcoursInitial = totalCouples - couplesParcoursBac

  const moduleSlugs = effectiveModules.map(m => m.slug)
  const moduleNames: Record<string, string> = Object.fromEntries(effectiveModules.map(m => [m.slug, m.titre]))

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
    { label: 'Couples — parcours rendez-vous annuel', value: couplesParcoursBac, color: 'var(--sage)', href: '/admin/couples' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Vue d&apos;ensemble</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Tableau de bord administrateur YES BOX</p>
      </div>

      <TachesClient taches={taches} tableManquante={tableManquante} />
      <ProblemesConnexionClient {...problemes} />

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
