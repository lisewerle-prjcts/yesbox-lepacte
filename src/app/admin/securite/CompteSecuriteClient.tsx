'use client'

import { useState } from 'react'
import { Mail, KeyRound, LogOut, ShieldCheck, Check, X } from 'lucide-react'
import {
  setRecoveryEmail, changerMotDePasse, deconnecterAutresSessions,
  demarrerActivationMfa, confirmerActivationMfa, desactiverMfa,
} from '@/app/actions/security'

interface MfaFactor { id: string; friendlyName: string }

export default function CompteSecuriteClient({
  email,
  recoveryEmail: initialRecoveryEmail,
  mfaFactors: initialMfaFactors,
}: {
  email: string
  recoveryEmail: string
  mfaFactors: MfaFactor[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RecoveryEmailCard email={email} initialRecoveryEmail={initialRecoveryEmail} />
      <PasswordCard />
      <SessionsCard />
      <MfaCard initialFactors={initialMfaFactors} />
    </div>
  )
}

function RecoveryEmailCard({ email, initialRecoveryEmail }: { email: string; initialRecoveryEmail: string }) {
  const [value, setValue] = useState(initialRecoveryEmail)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    const res = await setRecoveryEmail(value)
    setStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: 15 }}><Mail className="w-4 h-4" /> Email de récupération</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Compte connecté : <span className="font-mono">{email}</span>. Reçoit les notifications de sécurité (changement de mot de passe, déconnexion de sessions, 2FA).
      </p>
      <div className="flex gap-2 flex-wrap">
        <input
          type="email"
          className="field"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="adresse de secours"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button onClick={save} disabled={status === 'saving' || !value} className="btn-brand" style={{ padding: '8px 16px' }}>
          {status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? <><Check className="w-4 h-4 inline" /> Sauvegardé</> : status === 'error' ? 'Erreur' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (next !== confirm) { setError('Les deux mots de passe ne correspondent pas'); return }
    if (next.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères'); return }
    setStatus('saving')
    const res = await changerMotDePasse(current, next)
    if (res.error) {
      setError(res.error)
      setStatus('error')
    } else {
      setStatus('saved')
      setCurrent(''); setNext(''); setConfirm('')
    }
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: 15 }}><KeyRound className="w-4 h-4" /> Changer le mot de passe</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Saisis le nouveau mot de passe deux fois pour éviter une faute de frappe.</p>
      <div className="space-y-2">
        <input type="password" className="field" placeholder="Mot de passe actuel" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
        <input type="password" className="field" placeholder="Nouveau mot de passe" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
        <input type="password" className="field" placeholder="Confirmer le nouveau mot de passe" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
        <button
          onClick={submit}
          disabled={status === 'saving' || !current || !next || !confirm}
          className="btn-brand"
          style={{ padding: '8px 16px' }}
        >
          {status === 'saving' ? 'Modification…' : status === 'saved' ? <><Check className="w-4 h-4 inline" /> Modifié</> : 'Modifier le mot de passe'}
        </button>
      </div>
    </div>
  )
}

function SessionsCard() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function disconnect() {
    setStatus('loading')
    const res = await deconnecterAutresSessions()
    setStatus(res.error ? 'error' : 'done')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: 15 }}><LogOut className="w-4 h-4" /> Sessions actives</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Déconnecte immédiatement le compte admin de tous les autres appareils/navigateurs connectés, sans toucher à la session en cours.
      </p>
      <button
        onClick={disconnect}
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626', opacity: status === 'loading' ? 0.5 : 1 }}
      >
        {status === 'done' ? <><Check className="w-3.5 h-3.5" /> Sessions déconnectées</> : status === 'error' ? 'Erreur — réessaie' : status === 'loading' ? 'Déconnexion…' : <><LogOut className="w-3.5 h-3.5" /> Déconnecter les autres sessions</>}
      </button>
    </div>
  )
}

function MfaCard({ initialFactors }: { initialFactors: MfaFactor[] }) {
  const [factors, setFactors] = useState(initialFactors)
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function startEnroll() {
    setError('')
    setBusy(true)
    const res = await demarrerActivationMfa()
    setBusy(false)
    if (res.error || !res.factorId) { setError(res.error || 'Erreur'); return }
    setEnrolling({ factorId: res.factorId, qrCode: res.qrCode!, secret: res.secret! })
  }

  async function confirmEnroll() {
    if (!enrolling) return
    setError('')
    setBusy(true)
    const res = await confirmerActivationMfa(enrolling.factorId, code)
    setBusy(false)
    if (res.error) { setError(res.error); return }
    setFactors(f => [...f, { id: enrolling.factorId, friendlyName: 'YES BOX Admin' }])
    setEnrolling(null)
    setCode('')
  }

  async function remove(factorId: string) {
    setBusy(true)
    await desactiverMfa(factorId)
    setBusy(false)
    setFactors(f => f.filter(x => x.id !== factorId))
  }

  async function cancelEnroll() {
    if (!enrolling) return
    setBusy(true)
    await desactiverMfa(enrolling.factorId, true)
    setBusy(false)
    setEnrolling(null)
    setCode('')
    setError('')
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: 15 }}><ShieldCheck className="w-4 h-4" /> Double authentification (2FA)</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Protège le compte admin même si le mot de passe fuite, avec une application comme Google Authenticator.
      </p>

      {factors.length > 0 && !enrolling && (
        <div className="space-y-2">
          {factors.map(f => (
            <div key={f.id} className="surface p-3 flex items-center justify-between gap-3">
              <span style={{ fontSize: 13 }}><Check className="w-3.5 h-3.5 inline mr-1" style={{ color: 'var(--sage)' }} /> {f.friendlyName} — activée</span>
              <button disabled={busy} onClick={() => remove(f.id)} className="text-xs" style={{ color: '#dc2626' }}>Désactiver</button>
            </div>
          ))}
        </div>
      )}

      {factors.length === 0 && !enrolling && (
        <button onClick={startEnroll} disabled={busy} className="btn-brand" style={{ padding: '8px 16px' }}>
          {busy ? 'Chargement…' : 'Activer la 2FA'}
        </button>
      )}

      {enrolling && (
        <div className="space-y-3">
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Scanne ce QR code avec ton application d&apos;authentification, puis saisis le code à 6 chiffres généré.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="QR code 2FA" width={160} height={160} />
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Ou saisis manuellement : <span className="font-mono">{enrolling.secret}</span></p>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              inputMode="numeric"
              className="field"
              style={{ maxWidth: 140 }}
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <button onClick={confirmEnroll} disabled={busy || code.length < 6} className="btn-brand" style={{ padding: '8px 16px' }}>Confirmer</button>
            <button onClick={cancelEnroll} disabled={busy} className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}><X className="w-3.5 h-3.5" /> Annuler</button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</p>}
    </div>
  )
}
