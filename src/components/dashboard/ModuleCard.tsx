import Link from 'next/link'
import { clsx } from 'clsx'
import { Lock, CheckCircle, ChevronRight } from 'lucide-react'
import type { ModuleInfo, Module, ModuleStatut } from '@/types'

interface ModuleCardProps {
  moduleInfo: ModuleInfo
  moduleData?: Module
  statut: ModuleStatut
  index: number
}

const statutLabels: Record<ModuleStatut, string> = {
  locked: 'Verrouillé',
  en_cours: 'En cours',
  complete: 'Terminé',
}

export default function ModuleCard({ moduleInfo, moduleData, statut, index }: ModuleCardProps) {
  const isLocked = statut === 'locked'
  const isComplete = statut === 'complete'
  const isEnCours = statut === 'en_cours'

  const content = (
    <div
      className={clsx(
        'card relative overflow-hidden transition-all duration-200',
        isLocked && 'opacity-60',
        !isLocked && 'hover:shadow-md hover:-translate-y-1 cursor-pointer'
      )}
    >
      {/* Indicateur de statut */}
      <div
        className={clsx(
          'absolute top-4 right-4 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
          isComplete && 'bg-green-100 text-green-700',
          isEnCours && 'bg-magenta-50 text-magenta',
          isLocked && 'bg-gray-100 text-gray-400'
        )}
      >
        {isLocked && <Lock className="w-3 h-3" />}
        {isComplete && <CheckCircle className="w-3 h-3" />}
        <span>{statutLabels[statut]}</span>
      </div>

      {/* Numéro */}
      <div className="text-xs text-gray-400 font-semibold mb-2">
        Module {String(index + 1).padStart(2, '0')}
      </div>

      {/* Emoji & Titre */}
      <div className="text-3xl mb-2">{moduleInfo.emoji}</div>
      <h3 className="font-fraunces text-lg font-bold text-gray-900 mb-1 pr-20">
        {moduleInfo.titre}
      </h3>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        {moduleInfo.description}
      </p>

      {/* Nb questions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {moduleInfo.questions.length} questions
        </span>
        {!isLocked && (
          <ChevronRight
            className={clsx(
              'w-4 h-4',
              isComplete ? 'text-green-500' : 'text-magenta'
            )}
          />
        )}
      </div>

      {/* Barre de couleur en bas */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300"
        style={{
          backgroundColor: isComplete
            ? '#2ECC71'
            : isEnCours
            ? 'var(--brand)'
            : 'transparent',
        }}
      />
    </div>
  )

  if (isLocked) return content

  return (
    <Link href={`/module/${moduleInfo.slug}`} className="block">
      {content}
    </Link>
  )
}
