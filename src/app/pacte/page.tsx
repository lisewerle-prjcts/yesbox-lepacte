import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getProchainAnniversaire } from '@/lib/anniversaires'
import EditableText from '@/components/edit-mode/EditableText'
import { CheckCircle, Lock, Heart, ScrollText, Gift, KeyRound } from 'lucide-react'
import type { Module, Reponse } from '@/types'

export default async function PactePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const MODULES = await getEffectiveModules()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, couples(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) {
    redirect('/inviter-partenaire')
  }

  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('couple_id', profile.couple_id)

  const { data: allReponses } = await supabase
    .from('reponses')
    .select('*')
    .in('module_id', modules?.map((m: Module) => m.id) || [])

  const { data: partner } = await supabase
    .from('profiles')
    .select('prenom, email, id')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  const modulesTermines = modules?.filter((m: Module) => m.statut === 'complete') || []
  const tousTermines = modulesTermines.length === 7

  function getReponsesModule(moduleId: string, userId: string): Reponse[] {
    return allReponses?.filter((r: Reponse) => r.module_id === moduleId && r.user_id === userId) || []
  }

  const couple = Array.isArray(profile.couples) ? profile.couples[0] : profile.couples
  const prochainAnniversaire = couple?.date_anniversaire ? getProchainAnniversaire(couple.date_anniversaire) : null
  const anneesEnsemble = prochainAnniversaire ? prochainAnniversaire.years - 1 : null

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-6 h-6 text-magenta" />
          <h1 className="font-fraunces text-3xl font-bold text-gray-900">
            <EditableText id="pacte.titre">Notre Pacte</EditableText>
          </h1>
        </div>
        <p className="text-gray-500">
          {tousTermines
            ? <EditableText id="pacte.souscritre.complet" multiline>Votre pacte est complet — découvrez vos réponses et alignements.</EditableText>
            : `${modulesTermines.length} module${modulesTermines.length > 1 ? 's' : ''} terminé${modulesTermines.length > 1 ? 's' : ''} sur 7`}
        </p>
      </div>

      {couple?.pairing_code && (
        <div className="card flex items-center gap-3 mb-4 bg-magenta-50 border-magenta-100">
          <KeyRound className="w-4 h-4 text-magenta flex-shrink-0" />
          <p className="text-sm text-gray-700">
            Code de votre pacte : <span className="font-mono font-bold tracking-widest text-magenta">{couple.pairing_code}</span>
          </p>
        </div>
      )}

      {prochainAnniversaire && (
        <div className="card mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-magenta" />
            <h2 className="font-fraunces text-lg font-bold text-gray-900">Votre anniversaire de couple</h2>
          </div>
          {anneesEnsemble !== null && anneesEnsemble > 0 && (
            <p className="text-gray-700 text-sm mb-1">
              Vous êtes ensemble depuis <strong>{anneesEnsemble}</strong> an{anneesEnsemble > 1 ? 's' : ''}.
            </p>
          )}
          <p className="text-gray-700 text-sm mb-2">
            Prochain anniversaire le{' '}
            <strong>
              {prochainAnniversaire.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
            {' '}— vos <strong>{prochainAnniversaire.years}</strong> an{prochainAnniversaire.years > 1 ? 's' : ''}, les{' '}
            <span className="text-magenta font-semibold">noces de {prochainAnniversaire.matiere}</span>.
          </p>
        </div>
      )}

      {tousTermines ? (
        <div className="card bg-gradient-to-r from-magenta to-magenta-600 text-white mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6" />
            <h2 className="font-fraunces text-xl font-bold">
              <EditableText id="pacte.pret.titre">Votre Pacte est prêt !</EditableText>
            </h2>
          </div>
          <p className="text-magenta-100 text-sm">
            <EditableText id="pacte.pret.texte" multiline>Vous avez répondu à toutes les questions. Explorez vos alignements ci-dessous et signez votre pacte ensemble.</EditableText>
          </p>
        </div>
      ) : (
        <div className="card bg-cream-100 border-cream-300 mb-8">
          <p className="text-gray-600 text-sm">
            <EditableText id="pacte.incomplet.texte" multiline>Terminez tous les modules pour accéder à votre pacte complet et le signer ensemble.</EditableText>
          </p>
          <Link href="/tableau-de-bord" className="text-magenta text-sm font-semibold hover:underline mt-2 inline-block">
            <EditableText id="pacte.incomplet.cta">Continuer les modules →</EditableText>
          </Link>
        </div>
      )}

      {/* Modules et réponses */}
      <div className="space-y-6">
        {MODULES.map((moduleInfo) => {
          const moduleData = modules?.find((m: Module) => m.slug === moduleInfo.slug)
          const isComplete = moduleData?.statut === 'complete'

          if (!isComplete) {
            return (
              <div key={moduleInfo.slug} className="card opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{moduleInfo.emoji}</span>
                  <div>
                    <h3 className="font-fraunces font-bold text-gray-900"><EditableText id={`module.${moduleInfo.slug}.titre`}>{moduleInfo.titre}</EditableText></h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                      <Lock className="w-3 h-3" />
                      <span><EditableText id="pacte.nonterminee">Module non terminé</EditableText></span>
                    </div>
                  </div>
                  <Link href={`/module/${moduleInfo.slug}`} className="ml-auto btn-primary text-sm py-1.5">
                    <EditableText id="pacte.commencer">Commencer</EditableText>
                  </Link>
                </div>
              </div>
            )
          }

          const mesReponses = moduleData ? getReponsesModule(moduleData.id, user.id) : []
          const reponsesPartner = moduleData && partner ? getReponsesModule(moduleData.id, partner.id) : []

          return (
            <div key={moduleInfo.slug} className="card">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-cream-300">
                <span className="text-2xl">{moduleInfo.emoji}</span>
                <h3 className="font-fraunces text-lg font-bold text-gray-900"><EditableText id={`module.${moduleInfo.slug}.titre`}>{moduleInfo.titre}</EditableText></h3>
                <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  <EditableText id="pacte.terminee">Terminé</EditableText>
                </div>
              </div>

              <div className="space-y-5">
                {moduleInfo.questions.map((question) => {
                  const maReponse = mesReponses.find((r) => r.question_slug === question.slug)
                  const reponsePartner = reponsesPartner.find((r) => r.question_slug === question.slug)

                  return (
                    <div key={question.slug}>
                      <p className="text-sm font-semibold text-gray-700 mb-3">{question.texte}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-magenta-50 rounded-xl p-3">
                          <p className="text-xs text-magenta font-semibold mb-1">
                            {profile.prenom || 'Toi'}
                          </p>
                          <p className="text-sm text-gray-700">
                            {maReponse?.valeur || <span className="text-gray-400 italic">Sans réponse</span>}
                          </p>
                        </div>
                        {partner && (
                          <div className="bg-cream-100 rounded-xl p-3">
                            <p className="text-xs text-gray-500 font-semibold mb-1">
                              {partner.prenom || 'Partenaire'}
                            </p>
                            <p className="text-sm text-gray-700">
                              {reponsePartner?.valeur || <span className="text-gray-400 italic">En attente</span>}
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
        <div className="card text-center mt-8 py-10">
          <div className="text-4xl mb-4">💍</div>
          <h2 className="font-fraunces text-2xl font-bold text-gray-900 mb-3">
            <EditableText id="pacte.signature.titre">Signez votre Pacte</EditableText>
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            <EditableText id="pacte.signature.texte" multiline>En signant, vous vous engagez à honorer les valeurs et accords explorés ensemble.</EditableText>
          </p>
          <button className="btn-primary px-8 py-4 text-lg flex items-center gap-2 mx-auto">
            <Heart className="w-5 h-5" />
            <EditableText id="pacte.signature.cta">Signer notre Pacte</EditableText>
          </button>
        </div>
      )}
    </div>
  )
}
