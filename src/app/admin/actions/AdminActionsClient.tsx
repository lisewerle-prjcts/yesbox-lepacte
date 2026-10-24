'use client'

import { useState } from 'react'
import { Lock, Unlock, Eye, RotateCcw, Check } from 'lucide-react'
import {
  adminUnlockModule, adminLockModule, adminRevealModule,
  adminResetModule, adminSendEmail,
} from '@/app/actions/admin'
import Alert from '@/components/ui/Alert'
import ComposeurEmail, { BoutonsEnvoi, MESSAGE_VIDE, type MessageManuel, type ModeEnvoi, type ModeleComposeur } from '@/components/admin/ComposeurEmail'

interface Couple { id: string; created_at: string; members: { prenom?: string; email: string }[] }
interface Precommande { id: string; prenom: string; email: string }
interface ModuleInfo { slug: string; name: string }

export default function AdminActionsClient({
  couples,
  precommandes,
  defaultCoupleId,
  modules,
  modeles,
}: {
  couples: Couple[]
  precommandes: Precommande[]
  defaultCoupleId?: string
  modules: ModuleInfo[]
  modeles: ModeleComposeur[]
}) {
  const [selectedCouple, setSelectedCouple] = useState(defaultCoupleId || couples[0]?.id || '')
  // Le bloc des modules ne s'ouvre qu'au clic sur OK (ou en arrivant depuis
  // le bouton « Actions » d'un couple), pour garder la page compacte.
  const [modulesOuverts, setModulesOuverts] = useState(!!defaultCoupleId)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [erreur, setErreur] = useState<string | null>(null)

  // Email écrit à la main (ou à partir d'un modèle)
  const [emailTo, setEmailTo] = useState('')
  const [message, setMessage] = useState<MessageManuel>(MESSAGE_VIDE)
  const [envoi, setEnvoi] = useState<ModeEnvoi | null>(null)
  const [emailResultat, setEmailResultat] = useState<{ ok: boolean; texte: string } | null>(null)

  async function run(key: string, fn: () => Promise<{ success?: boolean; error?: string }>, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return
    setErreur(null)
    setLoading(l => ({ ...l, [key]: true }))
    let res: { success?: boolean; error?: string }
    try {
      res = await fn()
    } catch {
      res = { error: "L'action a échoué. Recharge la page et réessaie." }
    }
    setLoading(l => ({ ...l, [key]: false }))
    if (res.error) {
      setErreur(res.error)
      return
    }
    setDone(d => ({ ...d, [key]: true }))
    setTimeout(() => setDone(d => ({ ...d, [key]: false })), 2500)
  }

  const couple = couples.find(c => c.id === selectedCouple)
  const coupleLabel = couple?.members.map(m => m.prenom || m.email).join(' & ') || '—'

  async function sendEmail(mode: ModeEnvoi) {
    setEnvoi(mode)
    setEmailResultat(null)
    try {
      const res = await adminSendEmail(emailTo, message, mode)
      if (res.error) setEmailResultat({ ok: false, texte: res.error })
      else {
        setEmailResultat({ ok: true, texte: `E-mail envoyé à ${emailTo} (version ${res.langue === 'en' ? 'anglaise' : 'française'}).` })
        setEmailTo('')
        setMessage(MESSAGE_VIDE)
      }
    } catch {
      setEmailResultat({ ok: false, texte: "L'envoi a échoué. Recharge la page et réessaie." })
    }
    setEnvoi(null)
  }

  return (
    <div className="space-y-6">
      {/* Sélection couple */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ fontSize: 15 }}>Sélectionner un couple</h2>
        <div className="flex gap-2">
          <select
            className="field"
            value={selectedCouple}
            onChange={e => { setSelectedCouple(e.target.value); setErreur(null); setModulesOuverts(false) }}
          >
            {couples.map(c => (
              <option key={c.id} value={c.id}>
                {c.members.map(m => m.prenom || m.email).join(' & ')} — {new Date(c.created_at).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setModulesOuverts(o => !o)}
            disabled={!selectedCouple}
            className="btn-secondary text-sm px-4"
            style={{ flexShrink: 0 }}
          >
            {modulesOuverts ? 'Masquer' : 'OK'}
          </button>
        </div>
      </div>

      {/* Actions sur modules */}
      {selectedCouple && modulesOuverts && (
        <div className="card p-5">
          <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Modules — <em style={{ color: 'var(--brand)', fontStyle: 'normal' }}>{coupleLabel}</em></h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Déclenche manuellement les transitions de chaque module.</p>
          {erreur && <Alert type="error" message={erreur} className="mb-4" />}
          <div className="space-y-3">
            {modules.map(({ slug, name }) => {
              const base = `${selectedCouple}-${slug}`
              const confirmationReset = `Réinitialiser « ${name} » pour ${coupleLabel} ?\n\nLes réponses et les conclusions des deux personnes sur ce module seront définitivement supprimées.`
              return (
                <div key={slug} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: `unlock-${base}`, icon: <Unlock className="w-3.5 h-3.5" />, label: 'Débloquer', fn: () => adminUnlockModule(selectedCouple, slug), color: 'var(--sage)' },
                      { key: `reveal-${base}`, icon: <Eye className="w-3.5 h-3.5" />, label: 'Révéler', fn: () => adminRevealModule(selectedCouple, slug), color: 'var(--brand)' },
                      { key: `reset-${base}`, icon: <RotateCcw className="w-3.5 h-3.5" />, label: 'Réinitialiser', fn: () => adminResetModule(selectedCouple, slug), color: 'var(--muted)', confirmation: confirmationReset },
                      { key: `lock-${base}`, icon: <Lock className="w-3.5 h-3.5" />, label: 'Verrouiller', fn: () => adminLockModule(selectedCouple, slug), color: '#dc2626' },
                    ].map(action => (
                      <button
                        key={action.key}
                        disabled={loading[action.key]}
                        onClick={() => run(action.key, action.fn, action.confirmation)}
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
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Vers n&apos;importe quelle adresse : un message écrit de zéro ou repris d&apos;un e-mail automatique. « Selon la langue choisie » utilise la langue de la personne si l&apos;adresse est inscrite (sinon le français).</p>

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
          <ComposeurEmail
            modeles={modeles}
            message={message}
            onChange={setMessage}
            aideVariables="Remplacées automatiquement si l’adresse est celle d’une personne inscrite : {prenom}, {partenaire} (prénom de l’autre membre du couple), {code} (code couple)."
          />
          {emailResultat && <Alert type={emailResultat.ok ? 'success' : 'error'} message={emailResultat.texte} />}
          <BoutonsEnvoi message={emailTo.trim() ? message : { ...MESSAGE_VIDE }} envoi={envoi} onEnvoyer={sendEmail} libelle="" />
        </div>
      </div>
    </div>
  )
}
