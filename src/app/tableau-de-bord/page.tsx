import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
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

  let mesReponses: { module_id: string; question_slug: string }[] = []

  if (profile?.couple_id) {
    const [{ data: mods }, { data: part }, { data: coup }] = await Promise.all([
      supabase.from('modules').select('*').eq('couple_id', profile.couple_id).order('created_at'),
      supabase.from('profiles').select('prenom, email').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
      supabase.from('couples').select('nom_couple, date_anniversaire').eq('id', profile.couple_id).single(),
    ])
    modules = mods || []
    partner = part
    couple = coup

    const moduleIds = modules.map(m => m.id)
    if (moduleIds.length) {
      const { data: reponses } = await supabase.from('reponses').select('module_id, question_slug').eq('user_id', user.id).in('module_id', moduleIds)
      mesReponses = reponses || []
    }
  }

  const inviteData = await getInviteLink()
  const effectiveModules = await getEffectiveModules()
  const totalModuleCount = effectiveModules.length

  const done = modules.filter(m => m.revealed).length
  const pct = totalModuleCount ? Math.round((done / totalModuleCount) * 100) : 0

  function getModStatus(slug: string): 'done' | 'active' | 'paywall' | 'locked' {
    const mod = modules.find(m => m.slug === slug)
    if (!mod) return 'locked'
    if (mod.revealed) return 'done'
    if (mod.statut === 'complete') return 'done'
    if (mod.statut === 'en_cours') return 'active'
    return 'locked'
  }

  // Ai-je personnellement fini de répondre à ce module ? (moi/toi sont
  // tous les deux "en_cours" dès le départ pour le couple, mais chaque
  // membre y répond à son propre rythme — le statut couple ne suffit
  // pas à savoir où EN suis, MOI.)
  function iAmDoneWith(slug: string): boolean {
    const mod = modules.find(m => m.slug === slug)
    const moduleInfo = effectiveModules.find(m => m.slug === slug)
    if (!mod || !moduleInfo) return false
    const answered = new Set(mesReponses.filter(r => r.module_id === mod.id).map(r => r.question_slug))
    return moduleInfo.questions.every(q => answered.has(q.slug))
  }

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          <EditableText id="dashboard.bonjour.sansnom">Bonjour</EditableText>{profile?.prenom ? <>, <span style={{ color: 'var(--brand)' }}>{profile.prenom}</span></> : ''}
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
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{done} module{done > 1 ? 's' : ''} révélé{done > 1 ? 's' : ''} sur {totalModuleCount}</p>
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
        // "moi"/"toi" sont ouverts en parallèle dès le départ — chacun y
        // répond à son propre rythme, donc l'étape à proposer ici dépend
        // de MA propre progression, pas juste du statut couple. Mon ordre
        // naturel : mon module en premier (gratuit), puis l'autre (payant).
        const myPairOrder = profile?.role === 'partenaire' ? ['toi', 'moi'] : ['moi', 'toi']
        const myPairSlug = myPairOrder.find(slug => getModStatus(slug) !== 'locked' && getModStatus(slug) !== 'done' && !iAmDoneWith(slug))

        const nextIdx = myPairSlug
          ? effectiveModules.findIndex(m => m.slug === myPairSlug)
          : effectiveModules.findIndex((m, i) => i >= 2 && getModStatus(m.slug) === 'active')
        if (nextIdx === -1) return null
        const next = effectiveModules[nextIdx]
        return (
          <div className="card p-5 mb-6 flex flex-wrap items-center gap-4" style={{ background: `linear-gradient(120deg, var(--brand-tint), var(--paper))` }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="font-mono text-xs font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}><EditableText id="dashboard.prochaineetape.label">PROCHAINE ÉTAPE</EditableText> · MODULE 0{nextIdx + 1}</p>
              <p className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>{next.titre}</p>
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
