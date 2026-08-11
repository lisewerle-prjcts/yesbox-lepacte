'use client'

import { useState } from 'react'
import { Save, RotateCcw, Check, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import {
  adminSaveQuestionOverride, adminResetQuestionOverride,
  adminRemoveQuestion, adminRestoreQuestion,
  adminAddQuestion, adminUpdateCustomQuestion, adminRemoveCustomQuestion,
} from '@/app/actions/admin'
import type { ModuleInfo, Question, QuestionType } from '@/types'

interface QuestionOverride {
  texte?: string
  hint?: string
  options?: string[]
  labelMin?: string
  labelMax?: string
}

interface ModuleContentOverrides {
  overrides: Record<string, QuestionOverride>
  hidden: string[]
  custom: Question[]
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Réponse libre',
  choix: 'Choix unique',
  choix_multiple: 'Choix multiple',
  echelle: 'Échelle',
}

export default function ContenuClient({
  modules,
  overrides,
}: {
  modules: ModuleInfo[]
  overrides: Record<string, ModuleContentOverrides>
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>(modules[0]?.slug || '')
  const moduleInfo = modules.find(m => m.slug === selectedSlug)
  const moduleOverrides: ModuleContentOverrides = overrides[selectedSlug] || { overrides: {}, hidden: [], custom: [] }
  const [showAddForm, setShowAddForm] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  if (!moduleInfo) return null

  const hiddenSlugs = new Set(moduleOverrides.hidden)
  const activeBaseQuestions = moduleInfo.questions.filter(q => !hiddenSlugs.has(q.slug))
  const hiddenQuestions = moduleInfo.questions.filter(q => hiddenSlugs.has(q.slug))
  const customQuestions = moduleOverrides.custom

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ fontSize: 15 }}>Module</h2>
        <select className="field" value={selectedSlug} onChange={e => { setSelectedSlug(e.target.value); setShowAddForm(false); setShowHidden(false) }}>
          {modules.map(m => (
            <option key={m.slug} value={m.slug}>Module {m.n} — {m.titre}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {activeBaseQuestions.map(question => (
          <QuestionEditor
            key={question.slug}
            moduleSlug={moduleInfo.slug}
            baseQuestion={question}
            override={moduleOverrides.overrides[question.slug]}
            kind="base"
          />
        ))}
        {customQuestions.map(question => (
          <QuestionEditor
            key={question.slug}
            moduleSlug={moduleInfo.slug}
            baseQuestion={question}
            kind="custom"
          />
        ))}
      </div>

      {hiddenQuestions.length > 0 && (
        <div className="card p-5">
          <button onClick={() => setShowHidden(s => !s)} className="flex items-center gap-2 w-full text-left" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
            {showHidden ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Questions retirées ({hiddenQuestions.length})
          </button>
          {showHidden && (
            <div className="mt-4 space-y-2">
              {hiddenQuestions.map(q => (
                <div key={q.slug} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{q.texte}</span>
                  <RestoreButton moduleSlug={moduleInfo.slug} questionSlug={q.slug} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <button onClick={() => setShowAddForm(s => !s)} className="btn-brand text-sm py-2 px-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter une question
        </button>
        {showAddForm && (
          <div className="mt-4">
            <AddQuestionForm moduleSlug={moduleInfo.slug} onDone={() => setShowAddForm(false)} />
          </div>
        )}
      </div>
    </div>
  )
}

function RestoreButton({ moduleSlug, questionSlug }: { moduleSlug: string; questionSlug: string }) {
  const [loading, setLoading] = useState(false)
  async function restore() {
    setLoading(true)
    await adminRestoreQuestion(moduleSlug, questionSlug)
    setLoading(false)
  }
  return (
    <button
      onClick={restore}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--sage)', opacity: loading ? 0.5 : 1 }}
    >
      <RotateCcw className="w-3.5 h-3.5" /> Restaurer
    </button>
  )
}

function QuestionEditor({
  moduleSlug,
  baseQuestion,
  override,
  kind,
}: {
  moduleSlug: string
  baseQuestion: Question
  override?: QuestionOverride
  kind: 'base' | 'custom'
}) {
  const [texte, setTexte] = useState(override?.texte ?? baseQuestion.texte)
  const [hint, setHint] = useState(override?.hint ?? baseQuestion.hint ?? '')
  const [optionsText, setOptionsText] = useState((override?.options ?? baseQuestion.options ?? []).join('\n'))
  const [labelMin, setLabelMin] = useState(override?.labelMin ?? baseQuestion.labelMin ?? '')
  const [labelMax, setLabelMax] = useState(override?.labelMax ?? baseQuestion.labelMax ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [overridden, setOverridden] = useState(!!override)
  const [removed, setRemoved] = useState(false)

  if (removed) return null

  async function save() {
    setSaving(true)
    const fields = { texte, hint: hint || undefined } as QuestionOverride
    if (baseQuestion.type === 'choix' || baseQuestion.type === 'choix_multiple') {
      fields.options = optionsText.split('\n').map(s => s.trim()).filter(Boolean)
    }
    if (baseQuestion.type === 'echelle') {
      fields.labelMin = labelMin || undefined
      fields.labelMax = labelMax || undefined
    }
    if (kind === 'base') {
      await adminSaveQuestionOverride(moduleSlug, baseQuestion.slug, fields)
      setOverridden(true)
    } else {
      await adminUpdateCustomQuestion(moduleSlug, baseQuestion.slug, {
        type: baseQuestion.type,
        texte: fields.texte || texte,
        hint: fields.hint,
        options: fields.options,
        min: baseQuestion.min,
        max: baseQuestion.max,
        labelMin: fields.labelMin,
        labelMax: fields.labelMax,
      })
    }
    setSaving(false)
    setSaved(true)
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

  async function remove() {
    setSaving(true)
    if (kind === 'base') {
      await adminRemoveQuestion(moduleSlug, baseQuestion.slug)
    } else {
      await adminRemoveCustomQuestion(moduleSlug, baseQuestion.slug)
    }
    setSaving(false)
    setRemoved(true)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{baseQuestion.slug} · {TYPE_LABELS[baseQuestion.type]}</span>
        <div className="flex items-center gap-2">
          {kind === 'custom' && <span className="tag-sage" style={{ fontSize: 11 }}>Ajoutée</span>}
          {overridden && <span className="tag-brand" style={{ fontSize: 11 }}>Modifiée</span>}
        </div>
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
        {kind === 'base' && overridden && (
          <button
            onClick={reset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)', opacity: saving ? 0.5 : 1 }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser le texte
          </button>
        )}
        <button
          onClick={remove}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ml-auto"
          style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626', opacity: saving ? 0.5 : 1 }}
        >
          <Trash2 className="w-3.5 h-3.5" /> {kind === 'custom' ? 'Supprimer' : 'Retirer'}
        </button>
      </div>
    </div>
  )
}

function AddQuestionForm({ moduleSlug, onDone }: { moduleSlug: string; onDone: () => void }) {
  const [type, setType] = useState<QuestionType>('text')
  const [texte, setTexte] = useState('')
  const [hint, setHint] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [labelMin, setLabelMin] = useState('Pas vraiment')
  const [labelMax, setLabelMax] = useState('Pleinement')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setSaving(true)
    setError(null)
    const result = await adminAddQuestion(moduleSlug, {
      type,
      texte,
      hint: hint || undefined,
      options: (type === 'choix' || type === 'choix_multiple') ? optionsText.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
      min: type === 'echelle' ? 1 : undefined,
      max: type === 'echelle' ? 10 : undefined,
      labelMin: type === 'echelle' ? labelMin : undefined,
      labelMax: type === 'echelle' ? labelMax : undefined,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setTexte(''); setHint(''); setOptionsText('')
    onDone()
  }

  return (
    <div className="space-y-3">
      {error && <div className="alert-error" style={{ fontSize: 13 }}>{error}</div>}
      <div>
        <label className="flabel">Type de question</label>
        <select className="field" value={type} onChange={e => setType(e.target.value as QuestionType)}>
          <option value="text">Réponse libre</option>
          <option value="choix">Choix unique</option>
          <option value="choix_multiple">Choix multiple</option>
          <option value="echelle">Échelle (1 à 10)</option>
        </select>
      </div>
      <div>
        <label className="flabel">Question</label>
        <textarea className="field" rows={2} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Ex : Qu'est-ce qui vous rend fiers de votre couple ?" />
      </div>
      <div>
        <label className="flabel">Indice <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
        <input type="text" className="field" value={hint} onChange={e => setHint(e.target.value)} />
      </div>
      {(type === 'choix' || type === 'choix_multiple') && (
        <div>
          <label className="flabel">Options <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(une par ligne)</span></label>
          <textarea className="field" rows={4} value={optionsText} onChange={e => setOptionsText(e.target.value)} />
        </div>
      )}
      {type === 'echelle' && (
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
      <button
        onClick={add}
        disabled={saving || !texte.trim()}
        className="btn-brand text-sm py-2 px-4 flex items-center gap-2"
        style={{ opacity: (saving || !texte.trim()) ? 0.5 : 1 }}
      >
        <Plus className="w-4 h-4" /> {saving ? 'Ajout…' : 'Ajouter la question'}
      </button>
    </div>
  )
}
