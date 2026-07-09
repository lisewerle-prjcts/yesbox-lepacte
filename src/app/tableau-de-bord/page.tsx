import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getEffectiveSession } from '@/lib/effective-session'
import { MODULES, moduleTitre } from '@/lib/modules-data'
import type { Module } from '@/types'
import { Lock, CheckCircle, ChevronRight, UserPlus, ArrowRight, RotateCcw } from 'lucide-react'

export default async function TableauDeBordPage() {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  const { db: supabase, userId, profile, isImpersonating } = session

  if (profile && !profile.intro_vue && !isImpersonating) redirect('/bienvenue')

  let modulesRaw: Module[] = []
  let partner: { prenom: string | null; email: string; role: string | null } | null = null
  let couple: { nom_couple: string | null; prenom_partenaire1: string | null; prenom_partenaire2: string | null } | null = null

  if (profile?.couple_id) {
    const [{ data: mods }, { data: part }, { data: coup }] = await Promise.all([
      supabase.from('modules').select('*').eq('couple_id', profile.couple_id).order('cycle'),
      supabase.from('profiles').select('prenom, email, role').eq('couple_id', profile.couple_id).neq('id', userId).single(),
      supabase.from('couples').select('nom_couple, prenom_partenaire1, prenom_partenaire2').eq('id', profile.couple_id).single(),
    ])
    modulesRaw = mods || []
    partner = part
    couple = coup
  }

  // Ne garder que le cycle le plus récent par module (un RECOMMENCER LE MODULE
  // crée une nouvelle ligne sans effacer la précédente).
  const modules: Module[] = []
  const cyclesParSlug: Record<string, number> = {}
  for (const m of modulesRaw) {
    cyclesParSlug[m.slug] = Math.max(cyclesParSlug[m.slug] || 0, m.cycle)
    const existing = modules.find(x => x.slug === m.slug)
    if (!existing || m.cycle > existing.cycle) {
      if (existing) modules.splice(modules.indexOf(existing), 1, m)
      else modules.push(m)
    }
  }

  const prenomInitiateur = couple?.prenom_partenaire1 ?? (profile?.role === 'initiateur' ? profile?.prenom : partner?.prenom ?? null)
  const prenomPartenaire = couple?.prenom_partenaire2 ?? (profile?.role === 'partenaire' ? profile?.prenom : partner?.prenom ?? null)

  const done = modules.filter(m => m.revealed).length
  const pct = Math.round((done / MODULES.length) * 100)

  function getModStatus(slug: string): 'done' | 'active' | 'paywall' | 'locked' {
    const mod = modules.find(m => m.slug === slug)
    if (!mod) return 'locked'
    if (mod.revealed) return 'done'
    if (mod.statut === 'complete') return 'done'
    if (mod.statut === 'en_cours') return 'active'
    return 'locked'
  }

  function getModData(slug: string) { return modules.find(m => m.slug === slug) }

  // Scores de connivence des modules révélés (cycle courant), pour l'affichage par carte
  const scoresParModule: Record<string, { moi: number | null; partenaire: number | null }> = {}
  const idsRevealed = modules.filter(m => m.revealed).map(m => m.id)
  if (idsRevealed.length > 0) {
    const { data: scoresModules } = await supabase.from('scores').select('module_id, user_id, score').in('module_id', idsRevealed)
    for (const m of modules) {
      const moi = scoresModules?.find(s => s.module_id === m.id && s.user_id === userId)?.score ?? null
      const partenaireScore = scoresModules?.find(s => s.module_id === m.id && s.user_id !== userId)?.score ?? null
      scoresParModule[m.slug] = { moi, partenaire: partenaireScore }
    }
  }

  // Score total de connivence (modules 1 à 9, hors module 10 · BAC love)
  let scoreTotal: { moi: number; partenaire: number } | null = null
  const cddModule = getModData('cdd')
  if (profile?.couple_id && cddModule?.revealed) {
    const idsScorables = MODULES.filter(m => m.slug !== 'bac').map(m => getModData(m.slug)?.id).filter(Boolean) as string[]
    if (idsScorables.length > 0) {
      const { data: scores } = await supabase.from('scores').select('user_id, score').in('module_id', idsScorables)
      const moi = (scores || []).filter(s => s.user_id === userId).reduce((acc, s) => acc + s.score, 0)
      const partenaireTotal = (scores || []).filter(s => s.user_id !== userId).reduce((acc, s) => acc + s.score, 0)
      scoreTotal = { moi, partenaire: partenaireTotal }
    }
  }

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {couple?.nom_couple
            ? <>Bonjour, <span style={{ color: 'var(--brand)' }}>{couple.nom_couple}</span></>
            : <>Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''}</>}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {partner
            ? `Tu construis ce pacte avec ${partner.prenom || partner.email}`
            : "Invite ton/ta partenaire pour commencer le voyage ensemble"}
        </p>
      </div>

      {/* Bannière invitation */}
      {!profile?.couple_id && (
        <div className="card flex items-center justify-between flex-wrap gap-4 p-5 mb-6" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-soft)' }}>
              <UserPlus className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Invite ton/ta partenaire</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Le parcours est bien plus riche à deux</p>
            </div>
          </div>
          <Link href="/inviter-partenaire" className="btn-brand text-sm py-2">Envoyer l'invitation</Link>
        </div>
      )}

      {/* Progression */}
      {profile?.couple_id && (
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Votre progression</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{done} module{done > 1 ? 's' : ''} révélé{done > 1 ? 's' : ''} sur {MODULES.length}</p>
            </div>
            <span className="font-serif font-bold" style={{ fontSize: 28, color: pct === 100 ? 'var(--sage)' : 'var(--brand)' }}>{pct}%</span>
          </div>
          <div className="bar sage"><i style={{ width: `${pct}%` }} /></div>
          {pct === 100 && (
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--sage)' }}>🎉 Votre pacte est prêt à être signé !</span>
              <Link href="/pacte" className="btn-sage text-sm py-2">Voir notre Pacte</Link>
            </div>
          )}
        </div>
      )}

      {/* Score total de connivence — à la fin des 9 premiers modules */}
      {scoreTotal && (
        <div className="card p-5 mb-6" style={{ background: `linear-gradient(120deg, var(--brand-tint), var(--paper))` }}>
          <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Score total de connivence</h2>
          <div className="flex flex-wrap gap-8">
            <div>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{profile?.prenom || 'Toi'}</p>
              <p className="font-serif font-bold" style={{ fontSize: 26, color: 'var(--brand)' }}>{scoreTotal.moi} <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'inherit', fontWeight: 500 }}>/ {(MODULES.length - 1) * 5}</span></p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{partner?.prenom || 'Ton/ta partenaire'}</p>
              <p className="font-serif font-bold" style={{ fontSize: 26, color: 'var(--brand)' }}>{scoreTotal.partenaire} <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'inherit', fontWeight: 500 }}>/ {(MODULES.length - 1) * 5}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Prochaine étape */}
      {profile?.couple_id && (() => {
        const next = MODULES.find(m => getModStatus(m.slug) === 'active')
        if (!next) return null
        const titre = moduleTitre(next, prenomInitiateur, prenomPartenaire)
        return (
          <div className="card p-5 mb-6 flex flex-wrap items-center gap-4" style={{ background: `linear-gradient(120deg, var(--brand-tint), var(--paper))` }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="font-mono text-xs font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}>PROCHAINE ÉTAPE · MODULE {String(next.n).padStart(2, '0')}</p>
              <p className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>{titre}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{next.description}</p>
            </div>
            <Link href={`/module/${next.slug}`} className="btn-brand">
              Commencer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )
      })()}

      {/* Grille des 10 modules */}
      <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Les 10 modules de votre Pacte</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m, i) => {
          const st = profile?.couple_id ? getModStatus(m.slug) : (i === 0 ? 'active' : 'locked')
          const modData = getModData(m.slug)
          const isLocked = st === 'locked' || st === 'paywall'
          const isDone = st === 'done'
          const isActive = st === 'active'
          const titre = moduleTitre(m, prenomInitiateur, prenomPartenaire)
          const aEteRejoue = (cyclesParSlug[m.slug] || 1) > 1

          const card = (
            <div className="card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-150"
              style={{ opacity: isLocked ? .55 : 1, cursor: isLocked ? 'default' : 'pointer' }}>

              {/* Badge statut */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--muted)' }}>MODULE {String(m.n).padStart(2, '0')}</span>
                <div className="flex items-center gap-1.5">
                  {m.annuel && <span className="tag-muted">Annuel</span>}
                  {isDone && <span className="tag-sage"><CheckCircle className="w-3 h-3" />Révélé</span>}
                  {isActive && <span className="tag-brand">En cours</span>}
                  {isLocked && <span className="tag-muted"><Lock className="w-3 h-3" />Verrouillé</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}>{titre}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{m.sousTitre}</p>
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{m.description}</p>

              {/* Pied de carte */}
              {isDone && (scoresParModule[m.slug]?.moi || scoresParModule[m.slug]?.partenaire) && (
                <div className="flex flex-col gap-0.5" style={{ fontSize: 11.5 }}>
                  {scoresParModule[m.slug]?.moi != null && (
                    <span style={{ color: 'var(--muted)' }}>Toi <span style={{ color: 'var(--brand)' }}>{'★'.repeat(scoresParModule[m.slug]!.moi!)}{'☆'.repeat(5 - scoresParModule[m.slug]!.moi!)}</span></span>
                  )}
                  {scoresParModule[m.slug]?.partenaire != null && (
                    <span style={{ color: 'var(--muted)' }}>{partner?.prenom || 'Partenaire'} <span style={{ color: 'var(--brand)' }}>{'★'.repeat(scoresParModule[m.slug]!.partenaire!)}{'☆'.repeat(5 - scoresParModule[m.slug]!.partenaire!)}</span></span>
                  )}
                </div>
              )}
              {aEteRejoue && (
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  <RotateCcw className="w-3 h-3" />Rejoué {cyclesParSlug[m.slug]} fois
                </div>
              )}
              {isActive && !isDone && (
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--brand)' }}>
                  <span>Continuer</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}

              {/* Barre couleur bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: isDone ? 'var(--sage)' : isActive ? 'var(--brand)' : 'transparent' }} />
            </div>
          )

          if (isLocked) return <div key={m.slug}>{card}</div>
          if (isDone) return <Link key={m.slug} href={`/module/${m.slug}/revelation`}>{card}</Link>
          return <Link key={m.slug} href={`/module/${m.slug}`}>{card}</Link>
        })}
      </div>
    </div>
  )
}
