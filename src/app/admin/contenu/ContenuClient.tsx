'use client'

import { useState } from 'react'
import { Save, RotateCcw, Check } from 'lucide-react'
import { adminSaveQuestionOverride, adminResetQuestionOverride } from '@/app/actions/admin'
import type { ModuleInfo, Question } from '@/types'

interface QuestionOverride {
  texte?: string
  hint?: string
  options?: string[]
  labelMin?: string
  labelMax?: string
}

export default function ContenuClient({
  modules,
  overrides,
}: {
  modules: ModuleInfo[]
  overrides: Record<string, Record<string, QuestionOverride>>
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>(modules[0]?.slug || '')
  const moduleInfo = modules.find(m => m.slug === selectedSlug)
  const moduleOverrides = overrides[selectedSlug] || {}

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ fontSize: 15 }}>Module</h2>
        <select className="field" value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
          {modules.map(m => (
            <option key={m.slug} value={m.slug}>Module {m.n} — {m.titre}</option>
          ))}
        </select>
      </div>

      {moduleInfo && (
        <div className="space-y-4">
          {moduleInfo.questions.map(question => (
            <QuestionEditor
              key={question.slug}
              moduleSlug={moduleInfo.slug}
              baseQuestion={question}
              override={moduleOverrides[question.slug]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionEditor({
  moduleSlug,
  baseQuestion,
  override,
}: {
  moduleSlug: string
  baseQuestion: Question
  override?: QuestionOverride
}) {
  const [texte, setTexte] = useState(override?.texte ?? baseQuestion.texte)
  const [hint, setHint] = useState(override?.hint ?? baseQuestion.hint ?? '')
  const [optionsText, setOptionsText] = useState((override?.options ?? baseQuestion.options ?? []).join('\n'))
  const [labelMin, setLabelMin] = useState(override?.labelMin ?? baseQuestion.labelMin ?? '')
  const [labelMax, setLabelMax] = useState(override?.labelMax ?? baseQuestion.labelMax ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [overridden, setOverridden] = useState(!!override)

  async function save() {
    setSaving(true)
    const fields: QuestionOverride = { texte, hint: hint || undefined }
    if (baseQuestion.type === 'choix' || baseQuestion.type === 'choix_multiple') {
      fields.options = optionsText.split('\n').map(s => s.trim()).filter(Boolean)
    }
    if (baseQuestion.type === 'echelle') {
      fields.labelMin = labelMin || undefined
      fields.labelMax = labelMax || undefined
    }
    await adminSaveQuestionOverride(moduleSlug, baseQuestion.slug, fields)
    setSaving(false)
    setSaved(true)
    setOverridden(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function reset() {
    setSaving(true)
    await adminResetQuestionOverride(moduleSlug, baseQuestion.slug)
    setTexte(baseQuestion.texte)
    setHint(baseQuestion.hint || '')
    setOptionsText((baseQuestion.options || []).join('\n'))
    setLabelMin(baseQuestion.labelMin || '')
    setLabelMax(baseQuestion.labelMax || '')
    setSaving(false)
    setOverridden(false)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{baseQuestion.slug} · {baseQuestion.type}</span>
        {overridden && <span className="tag-brand" style={{ fontSize: 11 }}>Modifié</span>}
      </div>

      <div className="space-y-3">
        <div>
          <label className="flabel">Question</label>
          <textarea className="field" rows={2} value={texte} onChange={e => setTexte(e.target.value)} />
        </div>
        <div>
          <label className="flabel">Indice <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
          <input type="text" className="field" value={hint} onChange={e => setHint(e.target.value)} />
        </div>

        {(baseQuestion.type === 'choix' || baseQuestion.type === 'choix_multiple') && (
          <div>
            <label className="flabel">Options <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(une par ligne)</span></label>
            <textarea className="field" rows={4} value={optionsText} onChange={e => setOptionsText(e.target.value)} />
          </div>
        )}

        {baseQuestion.type === 'echelle' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flabel">Label minimum</label>
              <input type="text" className="field" value={labelMin} onChange={e => setLabelMin(e.target.value)} />
            </div>
            <div>
              <label className="flabel">Label maximum</label>
              <input type="text" className="field" value={labelMax} onChange={e => setLabelMax(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="btn-brand text-xs py-2 px-3 flex items-center gap-1.5"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
        {overridden && (
          <button
            onClick={reset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)', opacity: saving ? 0.5 : 1 }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
