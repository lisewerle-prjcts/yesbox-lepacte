import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import ProgressBar from '@/components/ui/ProgressBar'
import ModuleCard from '@/components/dashboard/ModuleCard'
import { UserPlus, Heart } from 'lucide-react'
import type { Module } from '@/types'

export default async function TableauDeBordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let modules: Module[] = []
  let partner: { prenom: string | null; email: string } | null = null
  let couple: { nom_couple: string | null } | null = null

  if (profile?.couple_id) {
    const { data: modulesData } = await supabase
      .from('modules')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at')

    modules = modulesData || []

    const { data: partnerData } = await supabase
      .from('profiles')
      .select('prenom, email')
      .eq('couple_id', profile.couple_id)
      .neq('id', user.id)
      .single()

    partner = partnerData

    const { data: coupleData } = await supabase
      .from('couples')
      .select('nom_couple')
      .eq('id', profile.couple_id)
      .single()

    couple = coupleData
  }

  const modulesTermines = modules.filter((m) => m.statut === 'complete').length
  const totalModules = 7
  const progression = Math.round((modulesTermines / totalModules) * 100)

  function getModuleStatut(slug: string) {
    return modules.find((m) => m.slug === slug)
  }

  return (
    <div className="animate-fade-in">
      {/* Header de bienvenue */}
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {couple?.nom_couple ? (
            <>Bienvenue, <span className="gradient-text">{couple.nom_couple}</span> ✨</>
          ) : (
            <>Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''} ✨</>
          )}
        </h1>
        <p className="text-gray-500">
          {partner
            ? `Tu construis ce pacte avec ${partner.prenom || partner.email}`
            : 'Invite ton/ta partenaire pour commencer le voyage ensemble'}
        </p>
      </div>

      {/* Bannière invitation si pas de partenaire */}
      {!profile?.couple_id && (
        <div className="card bg-gradient-to-r from-magenta-50 to-cream-200 border-magenta-200 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-magenta/10 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-magenta" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Invite ton/ta partenaire</p>
              <p className="text-sm text-gray-500">Le parcours est bien plus riche à deux</p>
            </div>
          </div>
          <Link href="/inviter-partenaire" className="btn-primary text-sm py-2">
            Envoyer l'invitation
          </Link>
        </div>
      )}

      {/* Progression globale */}
      {profile?.couple_id && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-fraunces text-xl font-bold text-gray-900">
                Votre progression
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {modulesTermines} module{modulesTermines > 1 ? 's' : ''} terminé{modulesTermines > 1 ? 's' : ''} sur {totalModules}
              </p>
            </div>
            <div className="text-right">
              <span className="font-fraunces text-2xl font-bold text-magenta">{progression}%</span>
              {progression === 100 && (
                <p className="text-xs text-green-600 font-semibold mt-0.5">Pacte complet !</p>
              )}
            </div>
          </div>
          <ProgressBar value={modulesTermines} max={totalModules} />

          {progression === 100 && (
            <div className="mt-4 pt-4 border-t border-cream-300 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <Heart className="w-5 h-5" />
                <span className="font-semibold">Félicitations ! Votre pacte est prêt à être signé.</span>
              </div>
              <Link href="/pacte" className="btn-primary text-sm py-2">
                Voir notre Pacte
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Grille des 7 modules */}
      <div>
        <h2 className="font-fraunces text-xl font-bold text-gray-900 mb-5">
          Les 7 piliers de votre Pacte
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((moduleInfo, index) => {
            const moduleData = getModuleStatut(moduleInfo.slug)
            const statut = profile?.couple_id
              ? (moduleData?.statut ?? 'locked')
              : index === 0
              ? 'en_cours'
              : 'locked'

            return (
              <ModuleCard
                key={moduleInfo.slug}
                moduleInfo={moduleInfo}
                moduleData={moduleData}
                statut={statut}
                index={index}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
