import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import { getInviteLink } from '@/app/actions/couple'
import EditableText from '@/components/edit-mode/EditableText'
import VotreCoupleCard from '@/components/dashboard/VotreCoupleCard'
import type { Module } from '@/types'
import { ArrowRight } from 'lucide-react'

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: { code_error?: string }
}) {
  const { code_error } = searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  let modules: Module[] = []
  let partner: { prenom: string | null; email: string } | null = null
  let couple: { nom_couple: string | null; date_anniversaire: string | null } | null = null

  if (profile?.couple_id) {
    const [{ data: mods }, { data: part }, { data: coup }] = await Promise.all([
      supabase.from('modules').select('*').eq('couple_id', profile.couple_id).order('created_at'),
      supabase.from('profiles').select('prenom, email').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
      supabase.from('couples').select('nom_couple, date_anniversaire').eq('id', profile.couple_id).single(),
    ])
    modules = mods || []
    partner = part
    couple = coup
  }

  const inviteData = await getInviteLink()

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

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {couple?.nom_couple
            ? <><EditableText id="dashboard.bonjour.avecnom">Bonjour,</EditableText> <span style={{ color: 'var(--brand)' }}>{couple.nom_couple}</span></>
            : <><EditableText id="dashboard.bonjour.sansnom">Bonjour</EditableText>{profile?.prenom ? `, ${profile.prenom}` : ''}</>}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {partner
            ? <><EditableText id="dashboard.souscritre.avecpartenaire">Tu construis ce pacte avec</EditableText> {partner.prenom || partner.email}</>
            : <EditableText id="dashboard.souscritre.invite">Invite ton/ta partenaire pour commencer le voyage ensemble</EditableText>}
        </p>
      </div>

      {profile?.couple_id && (
        <VotreCoupleCard
          hasPartner={!!partner}
          partnerPrenom={partner?.prenom ?? ''}
          dateAnniversaire={couple?.date_anniversaire ?? ''}
          pairingCode={inviteData.success ? inviteData.pairingCode ?? null : null}
          inviteLink={inviteData.success ? inviteData.link ?? null : null}
          initialCodeError={code_error}
        />
      )}

      {/* Progression */}
      {profile?.couple_id && (
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}><EditableText id="dashboard.progression.titre">Votre progression</EditableText></h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{done} module{done > 1 ? 's' : ''} révélé{done > 1 ? 's' : ''} sur 7</p>
            </div>
            <span className="font-serif font-bold" style={{ fontSize: 28, color: pct === 100 ? 'var(--sage)' : 'var(--brand)' }}>{pct}%</span>
          </div>
          <div className="bar sage"><i style={{ width: `${pct}%` }} /></div>
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="text-sm font-semibold" style={{ color: pct === 100 ? 'var(--sage)' : 'var(--muted)' }}>
              {pct === 100
                ? <EditableText id="dashboard.progression.complete">🎉 Votre pacte est prêt à être signé !</EditableText>
                : <EditableText id="dashboard.progression.encours">Voir le détail de votre progression</EditableText>}
            </span>
            <Link href="/pacte" className={pct === 100 ? 'btn-sage text-sm py-2' : 'btn-secondary text-sm py-2'}><EditableText id="dashboard.progression.voirpacte">Voir la progression</EditableText></Link>
          </div>
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
              <p className="font-mono text-xs font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}><EditableText id="dashboard.prochaineetape.label">PROCHAINE ÉTAPE</EditableText> · MODULE 0{next.n}</p>
              <p className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>{titre}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id={`module.${next.slug}.description`} multiline>{next.description}</EditableText></p>
            </div>
            <Link href={`/module/${next.slug}`} className="btn-brand">
              <EditableText id="dashboard.prochaineetape.commencer">Commencer</EditableText> <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )
      })()}
    </div>
  )
}
