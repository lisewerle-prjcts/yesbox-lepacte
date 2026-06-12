import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import { CheckCircle, Lock, Heart, ScrollText } from 'lucide-react'
import type { Module, Reponse } from '@/types'

export default async function PactePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

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

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-6 h-6 text-magenta" />
          <h1 className="font-fraunces text-3xl font-bold text-gray-900">
            Notre Pacte
          </h1>
        </div>
        <p className="text-gray-500">
          {tousTermines
            ? 'Votre pacte est complet — découvrez vos réponses et alignements.'
            : `${modulesTermines.length} module${modulesTermines.length > 1 ? 's' : ''} terminé${modulesTermines.length > 1 ? 's' : ''} sur 7`}
        </p>
      </div>

      {tousTermines ? (
        <div className="card bg-gradient-to-r from-magenta to-magenta-600 text-white mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6" />
            <h2 className="font-fraunces text-xl font-bold">
              Votre Pacte est prêt !
            </h2>
          </div>
          <p className="text-magenta-100 text-sm">
            Vous avez répondu à toutes les questions. Explorez vos alignements ci-dessous
            et signez votre pacte ensemble.
          </p>
        </div>
      ) : (
        <div className="card bg-cream-100 border-cream-300 mb-8">
          <p className="text-gray-600 text-sm">
            Terminez tous les modules pour accéder à votre pacte complet et le signer ensemble.
          </p>
          <Link href="/tableau-de-bord" className="text-magenta text-sm font-semibold hover:underline mt-2 inline-block">
            Continuer les modules →
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
                    <h3 className="font-fraunces font-bold text-gray-900">{moduleInfo.titre}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                      <Lock className="w-3 h-3" />
                      <span>Module non terminé</span>
                    </div>
                  </div>
                  <Link href={`/module/${moduleInfo.slug}`} className="ml-auto btn-primary text-sm py-1.5">
                    Commencer
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
                <h3 className="font-fraunces text-lg font-bold text-gray-900">{moduleInfo.titre}</h3>
                <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Terminé
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
            Signez votre Pacte
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            En signant, vous vous engagez à honorer les valeurs et accords explorés ensemble.
          </p>
          <button className="btn-primary px-8 py-4 text-lg flex items-center gap-2 mx-auto">
            <Heart className="w-5 h-5" />
            Signer notre Pacte
          </button>
        </div>
      )}
    </div>
  )
}
