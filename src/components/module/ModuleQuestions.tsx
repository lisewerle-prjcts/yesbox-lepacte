'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sauvegarderReponse, terminerModule } from '@/app/actions/modules'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import type { ModuleInfo, Module, Reponse, Question } from '@/types'

interface Props {
  moduleInfo: ModuleInfo
  moduleData: Module
  mesReponses: Reponse[]
  reponsesPartenaire: Reponse[]
  userId: string
  partnerName?: string | null
}

export default function ModuleQuestions({ moduleInfo, moduleData, mesReponses, reponsesPartenaire, partnerName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [idx, setIdx] = useState(() => {
    const saved: Record<string, string> = {}
    mesReponses.forEach(r => { if (r.valeur) saved[r.question_slug] = r.valeur })
    const first = moduleInfo.questions.findIndex(q => !saved[q.slug])
    return Math.max(0, first < 0 ? 0 : first)
  })
  const [reponses, setReponses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    mesReponses.forEach(r => { if (r.valeur) init[r.question_slug] = r.valeur })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(moduleData.statut === 'complete')

  const q = moduleInfo.questions[idx]
  const total = moduleInfo.questions.length
  const isFirst = idx === 0
  const isLast = idx === total - 1
  const answered = moduleInfo.questions.filter(qq => reponses[qq.slug] !== undefined && reponses[qq.slug] !== '').length
  const allAnswered = answered === total
  const partnerDone = reponsesPartenaire.length >= total

  async function saveAndNext() {
    setSaving(true)
    const val = reponses[q.slug]
    if (val !== undefined && val !== '') {
      await sauvegarderReponse(moduleData.id, q.slug, val)
    }
    setSaving(false)

    if (!isLast) {
      setIdx(idx + 1)
    } else if (allAnswered) {
      startTransition(async () => {
        await terminerModule(moduleData.id, moduleInfo.slug)
        setDone(true)
      })
    }
  }

  if (done) {
    return (
      <div className="card p-10 text-center fade" style={{ maxWidth: 520, margin: '0 auto' }}>
        {partnerDone ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--sage-soft)' }}>
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--sage)' }} />
            </div>
            <div className="eyebrow justify-center mb-3">Vous avez tous les deux répondu !</div>
            <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
              Moment de vérité ✦
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
              C'est le moment le plus précieux : découvrir ce que l'autre a écrit, côte à côte.
            </p>
            <Link href={`/module/${moduleInfo.slug}/revelation`} className="btn-sage lg">
              Ouvrir la session de révélation <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : (
          <>
            <div className="text-4xl mb-5">⏳</div>
            <div className="eyebrow justify-center mb-3">Module terminé</div>
            <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
              Tes réponses sont sauvegardées !
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              En attente de {partnerName || 'ton/ta partenaire'}… La révélation s'ouvrira quand vous aurez tous les deux terminé.
            </p>
            <Link href="/tableau-de-bord" className="btn-ghost">Retour au dashboard</Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="fade" style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/tableau-de-bord" className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="w-4 h-4" />Quitter
        </Link>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 24 }}>{moduleInfo.emoji}</span>
          <div>
            <p className="font-mono text-xs font-bold" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}>MODULE 0{moduleInfo.n}</p>
            <p className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}>{moduleInfo.titre}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="bar" style={{ height: 4 }}><i style={{ width: `${Math.round((idx / total) * 100)}%`, background: 'var(--brand)' }} /></div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Question {idx + 1} sur {total}</p>
      </div>

      {/* Question card */}
      <div className="card p-7 mb-5 slide-up" key={q.slug}>
        <div className="eyebrow mb-4">Question {String(idx + 1).padStart(2, '0')}</div>
        <h2 className="font-serif" style={{ fontSize: 'clamp(19px, 3vw, 24px)', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, marginBottom: q.hint ? 8 : 24 }}>
          {q.texte}
        </h2>
        {q.hint && (
          <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 20 }}>{q.hint}</p>
        )}
        <QuestionInput q={q} value={reponses[q.slug] ?? ''} onChange={v => setReponses(prev => ({ ...prev, [q.slug]: v }))} />
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={isFirst}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: isFirst ? 'var(--line)' : 'var(--muted)' }}>
          <ArrowLeft className="w-4 h-4" />Précédent
        </button>

        <button onClick={saveAndNext} disabled={saving || isPending || (!reponses[q.slug] && reponses[q.slug] !== '0')}
          className="btn-brand"
          style={{ opacity: (!reponses[q.slug] && reponses[q.slug] !== '0') ? .45 : 1 }}>
          {saving || isPending ? 'Sauvegarde…' : isLast && allAnswered ? 'Terminer le module' : 'Sauvegarder & continuer'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Partner status */}
      <p className="font-mono text-center mt-5" style={{ fontSize: 11, color: 'var(--muted)' }}>
        {partnerDone
          ? `✓ ${partnerName || 'Ton/ta partenaire'} a déjà terminé ce module`
          : reponsesPartenaire.length > 0
          ? `⏳ ${partnerName || 'Ton/ta partenaire'} répond de son côté…`
          : `${partnerName || 'Ton/ta partenaire'} n'a pas encore commencé`}
      </p>
    </div>
  )
}

function QuestionInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  if (q.type === 'text') {
    return (
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder="Écris ce qui te vient…" rows={4} className="field" />
    )
  }

  if ((q.type === 'choix' || q.type === 'choix_multiple') && q.options) {
    const isMulti = q.type === 'choix_multiple'
    const selected: (string | number)[] = isMulti
      ? (value ? value.split('||') : [])
      : [value]

    return (
      <div className="flex flex-col gap-2.5">
        {q.options.map((opt, i) => {
          const isOn = isMulti ? selected.includes(String(i)) : value === String(i)
          return (
            <button key={i} type="button" onClick={() => {
              if (isMulti) {
                const arr = selected.map(String)
                const si = String(i)
                const next = arr.includes(si) ? arr.filter(x => x !== si) : [...arr, si]
                onChange(next.join('||'))
              } else {
                onChange(String(i))
              }
            }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all text-sm font-medium"
              style={{
                background: isOn ? 'var(--brand-tint)' : 'var(--cream)',
                border: `1.5px solid ${isOn ? 'var(--brand)' : 'var(--line)'}`,
                color: isOn ? 'var(--brand)' : 'var(--ink)',
              }}>
              <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: isOn ? 'var(--brand)' : 'var(--muted-2)', background: isOn ? 'var(--brand)' : 'transparent' }}>
                {isOn && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === 'echelle') {
    const min = q.min ?? 1
    const max = q.max ?? 10
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    const val = value ? parseInt(value) : null

    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {steps.map(s => (
            <button key={s} type="button" onClick={() => onChange(String(s))}
              className="w-10 h-10 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: val === s ? 'var(--brand)' : 'var(--cream)',
                color: val === s ? 'white' : 'var(--ink)',
                border: `1.5px solid ${val === s ? 'var(--brand)' : 'var(--line)'}`,
              }}>
              {s}
            </button>
          ))}
        </div>
        {(q.labelMin || q.labelMax) && (
          <div className="flex justify-between mt-2" style={{ fontSize: 11, color: 'var(--muted)' }}>
            <span>{q.labelMin}</span><span>{q.labelMax}</span>
          </div>
        )}
      </div>
    )
  }

  return null
}
