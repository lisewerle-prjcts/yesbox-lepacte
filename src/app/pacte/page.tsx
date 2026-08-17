import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getAnniversaireActuel, getProchainAnniversaire } from '@/lib/anniversaires'
import EditableText from '@/components/edit-mode/EditableText'
import PacteDocument from './PacteDocument'
import { CheckCircle, Lock, Heart, ScrollText, Gift } from 'lucide-react'
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
    redirect('/inviter-partenaire')
  }

  const [{ data: modules }, { data: partner }, { data: couple }] = await Promise.all([
    supabase.from('modules').select('*').eq('couple_id', profile.couple_id),
    supabase.from('profiles').select('prenom, email, id').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
    supabase.from('couples').select('date_anniversaire, pacte_texte, pacte_modifie_le, pacte_modifie_par').eq('id', profile.couple_id).single(),
  ])

  const { data: allReponses } = await supabase
    .from('reponses')
    .select('*')
    .in('module_id', modules?.map((m: Module) => m.id) || [])

  const modulesTermines = modules?.filter((m: Module) => m.statut === 'complete') || []
  const tousTermines = modulesTermines.length === 7

  const anniversaireActuel = couple?.date_anniversaire ? getAnniversaireActuel(couple.date_anniversaire) : null
  const prochainAnniversaire = couple?.date_anniversaire ? getProchainAnniversaire(couple.date_anniversaire) : null
  const modifiePartPrenom = couple?.pacte_modifie_par === user.id ? (profile.prenom || 'Toi') : (couple?.pacte_modifie_par ? (partner?.prenom || 'Ton/ta partenaire') : null)

  function getReponsesModule(moduleId: string, userId: string): Reponse[] {
    return allReponses?.filter((r: Reponse) => r.module_id === moduleId && r.user_id === userId) || []
  }

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
          <ScrollText className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
            <EditableText id="pacte.titre">Notre Pacte</EditableText>
          </h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {tousTermines
            ? <EditableText id="pacte.souscritre.complet" multiline>Votre pacte est complet — découvrez vos réponses et alignements.</EditableText>
            : `${modulesTermines.length} module${modulesTermines.length > 1 ? 's' : ''} terminé${modulesTermines.length > 1 ? 's' : ''} sur 7`}
        </p>
      </div>

      {partner && (anniversaireActuel || prochainAnniversaire) && (
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              <EditableText id="pacte.anniversaire.titre">Votre anniversaire de couple</EditableText>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {anniversaireActuel && (
              <div className="surface p-4">
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  <EditableText id="pacte.anniversaire.encours">En cours</EditableText>
                </p>
                <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  <strong>{anniversaireActuel.years}</strong> an{anniversaireActuel.years > 1 ? 's' : ''} ensemble depuis le{' '}
                  {anniversaireActuel.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' '}— les <strong>noces de {anniversaireActuel.matiere}</strong>.
                </p>
              </div>
            )}
            {prochainAnniversaire && (
              <div className="surface p-4">
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  <EditableText id="pacte.anniversaire.avenir">À venir</EditableText>
                </p>
                <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  Le <strong>{prochainAnniversaire.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  {' '}— vos <strong>{prochainAnniversaire.years}</strong> an{prochainAnniversaire.years > 1 ? 's' : ''}, les{' '}
                  <strong>noces de {prochainAnniversaire.matiere}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {partner && (
        <PacteDocument
          initialTexte={couple?.pacte_texte ?? ''}
          modifiePar={modifiePartPrenom}
          modifieLe={couple?.pacte_modifie_le ?? null}
        />
      )}

      {tousTermines ? (
        <div className="card p-5 mb-6" style={{ background: 'linear-gradient(120deg, var(--brand), var(--brand-deep))', color: 'white' }}>
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6" />
            <h2 className="font-serif font-bold" style={{ fontSize: 20 }}>
              <EditableText id="pacte.pret.titre">Votre Pacte est prêt !</EditableText>
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.85)' }}>
            <EditableText id="pacte.pret.texte" multiline>Vous avez répondu à toutes les questions. Explorez vos alignements ci-dessous et signez votre pacte ensemble.</EditableText>
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
                  <span style={{ fontSize: 24 }}>{moduleInfo.emoji}</span>
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
                <span style={{ fontSize: 24 }}>{moduleInfo.emoji}</span>
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

      {tousTermines && (
        <div className="card p-5 text-center" style={{ marginTop: 24, paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💍</div>
          <h2 className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 12 }}>
            <EditableText id="pacte.signature.titre">Signez votre Pacte</EditableText>
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto 24px' }}>
            <EditableText id="pacte.signature.texte" multiline>En signant, vous vous engagez à honorer les valeurs et accords explorés ensemble.</EditableText>
          </p>
          <button className="btn-brand" style={{ padding: '16px 32px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Heart className="w-5 h-5" />
            <EditableText id="pacte.signature.cta">Signer notre Pacte</EditableText>
          </button>
        </div>
      )}
    </div>
  )
}
