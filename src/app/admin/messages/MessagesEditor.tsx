'use client'

import { useState } from 'react'
import { adminSaveMessage } from '@/app/actions/admin'
import { Check, RotateCcw } from 'lucide-react'

interface Msg { key: string; label: string; value: string; defaultValue: string; multiline: boolean }

export default function MessagesEditor({ messages }: { messages: Msg[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(messages.map(m => [m.key, m.value]))
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  async function save(key: string) {
    setSaving(s => ({ ...s, [key]: true }))
    await adminSaveMessage(key, values[key])
    setSaving(s => ({ ...s, [key]: false }))
    setSaved(s => ({ ...s, [key]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000)
  }

  return (
    <div className="space-y-5">
      {messages.map(m => (
        <div key={m.key} className="card p-5">
          <label className="flabel mb-2 block">{m.label}</label>
          <div className="font-mono text-xs mb-2 px-2 py-1 rounded w-fit" style={{ background: 'var(--cream-2)', color: 'var(--muted)' }}>{m.key}</div>
          {m.multiline ? (
            <textarea
              className="field"
              rows={4}
              value={values[m.key]}
              onChange={e => setValues(v => ({ ...v, [m.key]: e.target.value }))}
            />
          ) : (
            <input
              type="text"
              className="field"
              value={values[m.key]}
              onChange={e => setValues(v => ({ ...v, [m.key]: e.target.value }))}
            />
          )}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => save(m.key)}
              disabled={saving[m.key]}
              className="btn-brand py-2 px-4 text-sm"
            >
              {saved[m.key] ? <><Check className="w-3.5 h-3.5" /> Sauvegardé</> : saving[m.key] ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => setValues(v => ({ ...v, [m.key]: m.defaultValue }))}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: 'var(--muted)' }}
            >
              <RotateCcw className="w-3 h-3" /> Remettre par défaut
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
