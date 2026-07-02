import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import type { Module } from '@/types'
import { Lock, CheckCircle, ChevronRight, UserPlus, ArrowRight } from 'lucide-react'

export default async function TableauDeBordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  let modules: Module[] = []
  let partner: { prenom: string | null; email: string } | null = null
  let couple: { nom_couple: string | null } | null = null

  if (profile?.couple_id) {
    const [{ data: mods }, { data: part }, { data: coup }] = await Promise.all([
      supabase.from('modules').select('*').eq('couple_id', profile.couple_id).order('created_at'),
      supabase.from('profiles').select('prenom, email').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
      supabase.from('couples').select('nom_couple').eq('id', profile.couple_id).single(),
    ])
    modules = mods || []
    partner = part
    couple = coup
  }

  const done = modules.filter(m => m.revealed).length
  const pct = Math.round((done / 7) * 100)

  function getPersonalizedTitle(slug: string, defaultTitre: string, role?: string | null): string {
    if (slug === 'moi') return role === 'partenaire' ? 'Toi et moi' : 'Moi et toi'
    if (slug === 'toi') return role === 'partenaire' ? 'Moi et toi' : 'Toi et moi'
    return defaultTitre
  }

  function getModStatus(slug: string): 'done' | 'active' | 'paywall' | 'locked' {
    const mod = modules.find(m => m.slug === slug)
    if (!mod) return 'locked'
    if (mod.revealed) return 'done'
    if (mod.statut === 'complete') return 'done'
    if (mod.statut === 'en_cours') return 'active'
    return 'locked'
  }

  function getModData(slug: string) { return modules.find(m => m.slug === slug) }

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
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{done} module{done > 1 ? 's' : ''} révélé{done > 1 ? 's' : ''} sur 7</p>
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

      {/* Prochaine étape */}
      {profile?.couple_id && (() => {
        const next = MODULES.find(m => getModStatus(m.slug) === 'active')
        if (!next) return null
        const titre = getPersonalizedTitle(next.slug, next.titre, profile?.role)
        return (
          <div className="card p-5 mb-6 flex flex-wrap items-center gap-4" style={{ background: `linear-gradient(120deg, var(--brand-tint), var(--paper))` }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="font-mono text-xs font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}>PROCHAINE ÉTAPE · MODULE 0{next.n}</p>
              <p className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>{titre}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{next.description}</p>
            </div>
            <Link href={`/module/${next.slug}`} className="btn-brand">
              Commencer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )
      })()}

      {/* Grille 7 modules */}
      <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Les 7 piliers de votre Pacte</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m, i) => {
          const st = profile?.couple_id ? getModStatus(m.slug) : (i === 0 ? 'active' : 'locked')
          const modData = getModData(m.slug)
          const isLocked = st === 'locked' || st === 'paywall'
          const isDone = st === 'done'
          const isActive = st === 'active'

          const card = (
            <div className="card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-150"
              style={{ opacity: isLocked ? .55 : 1, cursor: isLocked ? 'default' : 'pointer' }}>

              {/* Badge statut */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--muted)' }}>MODULE 0{m.n}</span>
                {isDone && <span className="tag-sage"><CheckCircle className="w-3 h-3" />Révélé</span>}
                {isActive && <span className="tag-brand">En cours</span>}
                {isLocked && <span className="tag-muted"><Lock className="w-3 h-3" />Verrouillé</span>}
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}>{getPersonalizedTitle(m.slug, m.titre, profile?.role)}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{m.sousTitre}</p>
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{m.description}</p>

              {/* Pied de carte */}
              {isDone && modData?.connivence_score && (
                <div className="flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--brand)' }}>{'★'.repeat(modData.connivence_score)}{'☆'.repeat(5 - modData.connivence_score)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>connivence {modData.connivence_score}/5</span>
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
