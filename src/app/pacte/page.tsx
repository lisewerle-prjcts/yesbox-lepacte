import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getEffectiveSession } from '@/lib/effective-session'
import { MODULES, moduleTitre, questionTexte } from '@/lib/modules-data'
import type { Module, Reponse } from '@/types'

export default async function PactePage() {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  const { db: supabase, userId: myId, profile } = session

  if (!profile.couple_id) {
    redirect('/inviter-partenaire')
  }

  const { data: modulesRaw } = await supabase
    .from('modules')
    .select('*')
    .eq('couple_id', profile.couple_id)
    .order('cycle')

  // Cycle le plus récent par module
  const modules: Module[] = []
  for (const m of modulesRaw || []) {
    const existing = modules.find(x => x.slug === m.slug)
    if (!existing || m.cycle > existing.cycle) {
      if (existing) modules.splice(modules.indexOf(existing), 1, m)
      else modules.push(m)
    }
  }

  const { data: allReponses } = await supabase
    .from('reponses')
    .select('*')
    .in('module_id', modules.map((m: Module) => m.id))

  const [{ data: partner }, { data: couple }] = await Promise.all([
    supabase.from('profiles').select('prenom, email, id, role').eq('couple_id', profile.couple_id).neq('id', myId).single(),
    supabase.from('couples').select('prenom_partenaire1, prenom_partenaire2').eq('id', profile.couple_id).single(),
  ])

  const prenomInitiateur = couple?.prenom_partenaire1 ?? (profile.role === 'initiateur' ? profile.prenom : partner?.prenom ?? null)
  const prenomPartenaire = couple?.prenom_partenaire2 ?? (profile.role === 'partenaire' ? profile.prenom : partner?.prenom ?? null)

  const modulesTermines = modules.filter((m: Module) => m.statut === 'complete')
  const tousTermines = modulesTermines.length === MODULES.length

  function getReponsesModule(moduleId: string, userId: string): Reponse[] {
    return allReponses?.filter((r: Reponse) => r.module_id === moduleId && r.user_id === userId) || []
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-fraunces text-3xl font-bold text-gray-900">
            Notre Pacte
          </h1>
        </div>
        <p className="text-gray-500">
          {tousTermines
            ? 'Votre pacte est complet — découvrez vos réponses et alignements.'
            : `${modulesTermines.length} module${modulesTermines.length > 1 ? 's' : ''} terminé${modulesTermines.length > 1 ? 's' : ''} sur ${MODULES.length}`}
        </p>
      </div>

      {tousTermines ? (
        <div className="card bg-gradient-to-r from-magenta to-magenta-600 text-white mb-8">
          <div className="flex items-center gap-3 mb-2">
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
          const moduleData = modules.find((m: Module) => m.slug === moduleInfo.slug)
          const isComplete = moduleData?.statut === 'complete'
          const titre = moduleTitre(moduleInfo, prenomInitiateur, prenomPartenaire)

          if (!isComplete) {
            return (
              <div key={moduleInfo.slug} className="card opacity-60">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-fraunces font-bold text-gray-900">{titre}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
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

          const mesReponses = moduleData ? getReponsesModule(moduleData.id, myId) : []
          const reponsesPartner = moduleData && partner ? getReponsesModule(moduleData.id, partner.id) : []

          return (
            <div key={moduleInfo.slug} className="card">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-cream-300">
                <h3 className="font-fraunces text-lg font-bold text-gray-900">{titre}</h3>
                <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  Terminé
                </div>
              </div>

              <div className="space-y-5">
                {moduleInfo.questions.map((question) => {
                  const maReponse = mesReponses.find((r) => r.question_slug === question.slug)
                  const reponsePartner = reponsesPartner.find((r) => r.question_slug === question.slug)

                  return (
                    <div key={question.slug}>
                      <p className="text-sm font-semibold text-gray-700 mb-3">{questionTexte(question, profile.role)}</p>
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
          <h2 className="font-fraunces text-2xl font-bold text-gray-900 mb-3">
            Signez votre Pacte
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            En signant, vous vous engagez à honorer les valeurs et accords explorés ensemble.
          </p>
          <button className="btn-primary px-8 py-4 text-lg flex items-center gap-2 mx-auto">
            Signer notre Pacte
          </button>
        </div>
      )}
    </div>
  )
}
