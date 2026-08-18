import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import EditableText from '@/components/edit-mode/EditableText'
import { CheckCircle, Lock, Heart, ScrollText, ChevronRight } from 'lucide-react'
import type { Module, Reponse } from '@/types'

export default async function PactePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const MODULES = await getEffectiveModules()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) {
    redirect('/tableau-de-bord')
  }

  const [{ data: modules }, { data: partner }] = await Promise.all([
    supabase.from('modules').select('*').eq('couple_id', profile.couple_id),
    supabase.from('profiles').select('prenom, email, id').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
  ])

  const { data: allReponses } = await supabase
    .from('reponses')
    .select('*')
    .in('module_id', modules?.map((m: Module) => m.id) || [])

  const modulesTermines = modules?.filter((m: Module) => m.statut === 'complete') || []
  const tousTermines = modulesTermines.length === MODULES.length

  function getReponsesModule(moduleId: string, userId: string): Reponse[] {
    return allReponses?.filter((r: Reponse) => r.module_id === moduleId && r.user_id === userId) || []
  }

  function getModStatus(slug: string): 'done' | 'active' | 'locked' {
    const mod = modules?.find((m: Module) => m.slug === slug)
    if (!mod) return 'locked'
    if (mod.revealed || mod.statut === 'complete') return 'done'
    if (mod.statut === 'en_cours') return 'active'
    return 'locked'
  }

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
          <ScrollText className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
            <EditableText id="pacte.titre">Progression</EditableText>
          </h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {tousTermines
            ? <EditableText id="pacte.souscritre.complet" multiline>Votre pacte est complet — découvrez vos réponses et alignements.</EditableText>
            : `${modulesTermines.length} module${modulesTermines.length > 1 ? 's' : ''} terminé${modulesTermines.length > 1 ? 's' : ''} sur ${MODULES.length}`}
        </p>
      </div>

      {/* Grille des modules */}
      <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
        <EditableText id="pacte.grille.titre">Suivi de progression des modules</EditableText>
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {MODULES.map((m, i) => {
          const st = getModStatus(m.slug)
          const modData = modules?.find((mod: Module) => mod.slug === m.slug)
          const isLocked = st === 'locked'
          const isDone = st === 'done'
          const isActive = st === 'active'

          const card = (
            <div className="card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-150"
              style={{ opacity: isLocked ? .55 : 1, cursor: isLocked ? 'default' : 'pointer' }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--muted)' }}>MODULE 0{i + 1}</span>
                {isDone && <span className="tag-sage"><CheckCircle className="w-3 h-3" /><EditableText id="pacte.statut.revele">Révélé</EditableText></span>}
                {isActive && <span className="tag-brand"><EditableText id="pacte.statut.encours">En cours</EditableText></span>}
                {isLocked && <span className="tag-muted"><Lock className="w-3 h-3" /><EditableText id="pacte.statut.verrouille">Verrouillé</EditableText></span>}
              </div>

              <p className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}>{m.titre}</p>

              {isDone && modData?.connivence_score && (
                <div className="flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--brand)' }}>{'★'.repeat(modData.connivence_score)}{'☆'.repeat(5 - modData.connivence_score)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}><EditableText id="pacte.connivence.label">connivence</EditableText> {modData.connivence_score}/5</span>
                </div>
              )}
              {isActive && !isDone && (
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--brand)' }}>
                  <span><EditableText id="pacte.statut.continuer">Continuer</EditableText></span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}

              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: isDone ? 'var(--sage)' : isActive ? 'var(--brand)' : 'transparent' }} />
            </div>
          )

          if (isLocked) return <div key={m.slug}>{card}</div>
          if (isDone) return <Link key={m.slug} href={`/module/${m.slug}/revelation`}>{card}</Link>
          return <Link key={m.slug} href={`/module/${m.slug}`}>{card}</Link>
        })}
      </div>

      {tousTermines ? (
        <div className="card p-5 mb-6" style={{ background: 'linear-gradient(120deg, var(--brand), var(--brand-deep))', color: 'white' }}>
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6" />
            <h2 className="font-serif font-bold" style={{ fontSize: 20 }}>
              <EditableText id="pacte.pret.titre">Votre Pacte est prêt !</EditableText>
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.85)' }}>
            <EditableText id="pacte.pret.texte" multiline>Vous avez répondu à toutes les questions. Explorez vos alignements ci-dessous, puis rendez-vous sur Notre Pacte pour le signer ensemble.</EditableText>
          </p>
        </div>
      ) : (
        <div className="card p-5 mb-6" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
            <EditableText id="pacte.incomplet.texte" multiline>Terminez tous les modules pour accéder à votre pacte complet et le signer ensemble.</EditableText>
          </p>
          <Link href="/tableau-de-bord" className="text-sm font-semibold" style={{ color: 'var(--brand)', marginTop: 8, display: 'inline-block' }}>
            <EditableText id="pacte.incomplet.cta">Continuer les modules →</EditableText>
          </Link>
        </div>
      )}

      {/* Modules et réponses */}
      <div className="space-y-4">
        {MODULES.map((moduleInfo) => {
          const moduleData = modules?.find((m: Module) => m.slug === moduleInfo.slug)
          const isComplete = moduleData?.statut === 'complete'

          if (!isComplete) {
            return (
              <div key={moduleInfo.slug} className="card p-5" style={{ opacity: .6 }}>
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-serif font-bold" style={{ fontSize: 15, color: 'var(--ink)' }}><EditableText id={`module.${moduleInfo.slug}.titre`}>{moduleInfo.titre}</EditableText></h3>
                    <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      <Lock className="w-3 h-3" />
                      <span><EditableText id="pacte.nonterminee">Module non terminé</EditableText></span>
                    </div>
                  </div>
                  <Link href={`/module/${moduleInfo.slug}`} className="btn-brand text-sm py-1.5" style={{ marginLeft: 'auto' }}>
                    <EditableText id="pacte.commencer">Commencer</EditableText>
                  </Link>
                </div>
              </div>
            )
          }

          const mesReponses = moduleData ? getReponsesModule(moduleData.id, user.id) : []
          const reponsesPartner = moduleData && partner ? getReponsesModule(moduleData.id, partner.id) : []

          return (
            <div key={moduleInfo.slug} className="card p-5">
              <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
                <h3 className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}><EditableText id={`module.${moduleInfo.slug}.titre`}>{moduleInfo.titre}</EditableText></h3>
                <span className="tag-sage" style={{ marginLeft: 'auto' }}>
                  <CheckCircle className="w-3 h-3" />
                  <EditableText id="pacte.terminee">Terminé</EditableText>
                </span>
              </div>

              <div className="space-y-4">
                {moduleInfo.questions.map((question) => {
                  const maReponse = mesReponses.find((r) => r.question_slug === question.slug)
                  const reponsePartner = reponsesPartner.find((r) => r.question_slug === question.slug)

                  return (
                    <div key={question.slug}>
                      <p className="font-semibold" style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 10 }}>{question.texte}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="surface p-3" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
                          <p className="font-semibold" style={{ fontSize: 11, color: 'var(--brand)', marginBottom: 4 }}>
                            {profile.prenom || 'Toi'}
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                            {maReponse?.valeur || <span style={{ color: 'var(--muted-2)', fontStyle: 'italic' }}>Sans réponse</span>}
                          </p>
                        </div>
                        {partner && (
                          <div className="surface p-3">
                            <p className="font-semibold" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                              {partner.prenom || 'Partenaire'}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                              {reponsePartner?.valeur || <span style={{ color: 'var(--muted-2)', fontStyle: 'italic' }}>En attente</span>}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
