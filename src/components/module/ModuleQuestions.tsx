'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import { sauvegarderReponse, terminerModule } from '@/app/actions/modules'
import { ArrowLeft, ArrowRight, CheckCircle, ChevronLeft } from 'lucide-react'
import type { ModuleInfo, Module, Reponse, Question } from '@/types'

interface ModuleQuestionsProps {
  moduleInfo: ModuleInfo
  moduleData: Module
  mesReponses: Reponse[]
  reponsesPartenaire: Reponse[]
  userId: string
}

export default function ModuleQuestions({
  moduleInfo,
  moduleData,
  mesReponses,
  reponsesPartenaire,
}: ModuleQuestionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reponses, setReponses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    mesReponses.forEach((r) => {
      if (r.valeur) init[r.question_slug] = r.valeur
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(moduleData.statut === 'complete')

  const questions = moduleInfo.questions
  const currentQuestion = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const isFirst = currentIndex === 0

  const totalAnswered = questions.filter((q) => reponses[q.slug]).length
  const allAnswered = totalAnswered === questions.length

  async function saveAndNext() {
    setSaving(true)
    const valeur = reponses[currentQuestion.slug]
    if (valeur) {
      await sauvegarderReponse(moduleData.id, currentQuestion.slug, valeur)
    }
    setSaving(false)

    if (!isLast) {
      setCurrentIndex(currentIndex + 1)
    } else if (allAnswered) {
      startTransition(async () => {
        await terminerModule(moduleData.id, moduleInfo.slug)
        setCompleted(true)
      })
    }
  }

  function setReponse(slug: string, valeur: string) {
    setReponses((prev) => ({ ...prev, [slug]: valeur }))
  }

  if (completed) {
    const partnerAnsweredCount = reponsesPartenaire.length
    return (
      <div className="animate-slide-up">
        <Link href="/tableau-de-bord" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-magenta mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>

        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🎉</div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">
            Module {moduleInfo.titre} terminé !
          </h1>
          <p className="text-gray-500 mb-2">
            Tes réponses ont été sauvegardées.
          </p>
          {partnerAnsweredCount > 0 ? (
            <p className="text-sm text-magenta font-medium mb-8">
              Ton/ta partenaire a déjà répondu à {partnerAnsweredCount} question{partnerAnsweredCount > 1 ? 's' : ''} dans ce module.
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-8">
              En attente des réponses de ton/ta partenaire...
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/tableau-de-bord" className="btn-secondary">
              Retour au tableau de bord
            </Link>
            <Link href="/pacte" className="btn-primary">
              Voir notre Pacte
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <Link href="/tableau-de-bord" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-magenta mb-6">
        <ChevronLeft className="w-4 h-4" />
        Retour au tableau de bord
      </Link>

      {/* Header du module */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{moduleInfo.emoji}</span>
          <h1 className="font-fraunces text-2xl font-bold text-gray-900">
            {moduleInfo.titre}
          </h1>
        </div>
        <ProgressBar
          value={currentIndex}
          max={questions.length}
          showLabel={false}
          className="mt-4"
        />
        <p className="text-sm text-gray-400 mt-2">
          Question {currentIndex + 1} sur {questions.length}
        </p>
      </div>

      {/* Question card */}
      <div className="card mb-6 animate-slide-up" key={currentQuestion.slug}>
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-4">
          Question {currentIndex + 1}
        </div>
        <h2 className="font-fraunces text-xl font-bold text-gray-900 mb-6 leading-relaxed">
          {currentQuestion.texte}
        </h2>

        <QuestionInput
          question={currentQuestion}
          value={reponses[currentQuestion.slug] || ''}
          onChange={(v) => setReponse(currentQuestion.slug, v)}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={isFirst}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium transition-colors',
            isFirst ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:text-magenta'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Précédent
        </button>

        <button
          onClick={saveAndNext}
          disabled={saving || isPending || !reponses[currentQuestion.slug]}
          className={clsx(
            'btn-primary flex items-center gap-2',
            (!reponses[currentQuestion.slug]) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {(saving || isPending) && <Spinner size="sm" />}
          {isLast && allAnswered ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Terminer le module
            </>
          ) : (
            <>
              Suivant
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (v: string) => void
}) {
  if (question.type === 'texte') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écris ta réponse ici..."
        rows={4}
        className="input-field resize-none"
      />
    )
  }

  if (question.type === 'choix' && question.options) {
    return (
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={clsx(
              'w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 text-sm font-medium',
              value === option
                ? 'border-magenta bg-magenta-50 text-magenta'
                : 'border-cream-400 bg-white text-gray-700 hover:border-magenta-200'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'echelle') {
    const min = question.min ?? 1
    const max = question.max ?? 10
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

    return (
      <div>
        <div className="flex gap-2 flex-wrap">
          {steps.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => onChange(String(step))}
              className={clsx(
                'w-10 h-10 rounded-xl border-2 font-semibold text-sm transition-all duration-150',
                value === String(step)
                  ? 'border-magenta bg-magenta text-white'
                  : 'border-cream-400 bg-white text-gray-600 hover:border-magenta-200'
              )}
            >
              {step}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
          <span>Pas du tout</span>
          <span>Tout à fait</span>
        </div>
      </div>
    )
  }

  return null
}
