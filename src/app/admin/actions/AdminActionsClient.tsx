'use client'

import { useState } from 'react'
import { Lock, Unlock, Eye, RotateCcw, Send, Check } from 'lucide-react'
import {
  adminUnlockModule, adminLockModule, adminRevealModule,
  adminResetModule, adminSendEmail,
} from '@/app/actions/admin'

const SLUGS = ['partenaire1','partenaire2','couple','quotidien','projets','famille','communication','disputes','cdd','bac']
const NAMES: Record<string,string> = {
  partenaire1:'M1 — Partenaire 1', partenaire2:'M2 — Partenaire 2', couple:'M3 — Notre couple',
  quotidien:'M4 — Notre quotidien', projets:'M5 — Nos projets', famille:'M6 — La famille',
  communication:'M7 — Nos modes de communication', disputes:'M8 — Nos disputes',
  cdd:'M9 — Notre CDD de couple', bac:'M10 — Le BAC love',
}

interface Couple { id: string; created_at: string; members: { prenom?: string; email: string }[] }
interface Precommande { id: string; prenom: string; email: string }

export default function AdminActionsClient({
  couples,
  precommandes,
  defaultCoupleId,
}: {
  couples: Couple[]
  precommandes: Precommande[]
  defaultCoupleId?: string
}) {
  const [selectedCouple, setSelectedCouple] = useState(defaultCoupleId || couples[0]?.id || '')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})

  // Email custom
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')

  async function run(key: string, fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(l => ({ ...l, [key]: true }))
    await fn()
    setLoading(l => ({ ...l, [key]: false }))
    setDone(d => ({ ...d, [key]: true }))
    setTimeout(() => setDone(d => ({ ...d, [key]: false })), 2500)
  }

  const couple = couples.find(c => c.id === selectedCouple)
  const coupleLabel = couple?.members.map(m => m.prenom || m.email).join(' & ') || '—'

  async function sendEmail() {
    setEmailStatus('sending')
    const res = await adminSendEmail(emailTo, emailSubject, emailBody)
    setEmailStatus(res.error ? 'error' : 'sent')
    if (!res.error) { setEmailTo(''); setEmailSubject(''); setEmailBody('') }
    setTimeout(() => setEmailStatus('idle'), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Sélection couple */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ fontSize: 15 }}>Sélectionner un couple</h2>
        <select
          className="field"
          value={selectedCouple}
          onChange={e => setSelectedCouple(e.target.value)}
        >
          {couples.map(c => (
            <option key={c.id} value={c.id}>
              {c.members.map(m => m.prenom || m.email).join(' & ')} — {new Date(c.created_at).toLocaleDateString('fr-FR')}
            </option>
          ))}
        </select>
      </div>

      {/* Actions sur modules */}
      {selectedCouple && (
        <div className="card p-5">
          <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Modules — <em style={{ color: 'var(--brand)', fontStyle: 'normal' }}>{coupleLabel}</em></h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Déclenche manuellement les transitions de chaque module.</p>
          <div className="space-y-3">
            {SLUGS.map(slug => {
              const base = `${selectedCouple}-${slug}`
              return (
                <div key={slug} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{NAMES[slug]}</span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: `unlock-${base}`, icon: <Unlock className="w-3.5 h-3.5" />, label: 'Débloquer', fn: () => adminUnlockModule(selectedCouple, slug), color: 'var(--sage)' },
                      { key: `reveal-${base}`, icon: <Eye className="w-3.5 h-3.5" />, label: 'Révéler', fn: () => adminRevealModule(selectedCouple, slug), color: 'var(--brand)' },
                      { key: `reset-${base}`, icon: <RotateCcw className="w-3.5 h-3.5" />, label: 'Réinitialiser', fn: () => adminResetModule(selectedCouple, slug), color: 'var(--muted)' },
                      { key: `lock-${base}`, icon: <Lock className="w-3.5 h-3.5" />, label: 'Verrouiller', fn: () => adminLockModule(selectedCouple, slug), color: '#dc2626' },
                    ].map(action => (
                      <button
                        key={action.key}
                        disabled={loading[action.key]}
                        onClick={() => run(action.key, action.fn)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                        style={{ background: 'var(--paper)', border: `1px solid var(--line)`, color: action.color, opacity: loading[action.key] ? 0.5 : 1 }}
                      >
                        {done[action.key] ? <Check className="w-3.5 h-3.5" /> : action.icon}
                        {done[action.key] ? 'OK' : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Email custom */}
      <div className="card p-5">
        <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Envoyer un email</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Email libre vers n&apos;importe quelle adresse.</p>

        <div className="space-y-3">
          <div>
            <label className="flabel">Destinataire</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {precommandes.slice(0, 8).map(p => (
                <button
                  key={p.id}
                  onClick={() => setEmailTo(p.email)}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{
                    background: emailTo === p.email ? 'var(--brand)' : 'var(--cream-2)',
                    color: emailTo === p.email ? 'white' : 'var(--ink-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {p.prenom} — {p.email}
                </button>
              ))}
            </div>
            <input type="email" className="field" placeholder="ou tape une adresse" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
          </div>
          <div>
            <label className="flabel">Objet</label>
            <input type="text" className="field" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Objet de l'email" />
          </div>
          <div>
            <label className="flabel">Message (texte, les retours à la ligne sont conservés)</label>
            <textarea className="field" rows={6} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Bonjour,&#10;&#10;..." />
          </div>
          <button
            onClick={sendEmail}
            disabled={!emailTo || !emailSubject || !emailBody || emailStatus === 'sending'}
            className="btn-brand flex items-center gap-2"
          >
            {emailStatus === 'sending' ? 'Envoi…' : emailStatus === 'sent' ? <><Check className="w-4 h-4" /> Envoyé !</> : emailStatus === 'error' ? 'Erreur — réessaie' : <><Send className="w-4 h-4" /> Envoyer</>}
          </button>
        </div>
      </div>
    </div>
  )
}
