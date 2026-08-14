'use client'

import { useState } from 'react'
import { Mail, KeyRound, LogOut, ShieldCheck, Check, X, Monitor, Copy, RefreshCw } from 'lucide-react'
import {
  setRecoveryEmail, changerMotDePasse, deconnecterAutresSessions,
  demarrerActivationMfa, confirmerActivationMfa, desactiverMfa, genererCodesSecours,
} from '@/app/actions/security'

interface MfaFactor { id: string; friendlyName: string }
interface Session { id: string; createdAt: string; updatedAt: string; userAgent: string | null; ip: string | null; isCurrent: boolean }

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Appareil inconnu'
  let browser = 'Navigateur inconnu'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\//.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'

  let os = 'OS inconnu'
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  return `${browser} sur ${os}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function CompteSecuriteClient({
  email,
  recoveryEmail: initialRecoveryEmail,
  mfaFactors: initialMfaFactors,
  sessions,
  recoveryCodesCount: initialRecoveryCodesCount,
}: {
  email: string
  recoveryEmail: string
  mfaFactors: MfaFactor[]
  sessions: Session[]
  recoveryCodesCount: number
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RecoveryEmailCard email={email} initialRecoveryEmail={initialRecoveryEmail} />
      <PasswordCard />
      <SessionsCard sessions={sessions} />
      <MfaCard initialFactors={initialMfaFactors} initialRecoveryCodesCount={initialRecoveryCodesCount} />
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

function SessionsCard({ sessions }: { sessions: Session[] }) {
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mb-4"
        style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: '#dc2626', opacity: status === 'loading' ? 0.5 : 1 }}
      >
        {status === 'done' ? <><Check className="w-3.5 h-3.5" /> Sessions déconnectées</> : status === 'error' ? 'Erreur — réessaie' : status === 'loading' ? 'Déconnexion…' : <><LogOut className="w-3.5 h-3.5" /> Déconnecter les autres sessions</>}
      </button>

      <h3 className="font-semibold mb-2" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Historique des connexions</h3>
      {sessions.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Aucune session trouvée.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="surface p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {parseUserAgent(s.userAgent)}
                    {s.isCurrent && <span className="ml-2 px-1.5 py-0.5 rounded" style={{ fontSize: 10, background: 'var(--brand-tint)', color: 'var(--brand)' }}>session actuelle</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {s.ip ?? 'IP inconnue'} · dernière activité {formatDate(s.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MfaCard({ initialFactors, initialRecoveryCodesCount }: { initialFactors: MfaFactor[]; initialRecoveryCodesCount: number }) {
  const [factors, setFactors] = useState(initialFactors)
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryCodesCount, setRecoveryCodesCount] = useState(initialRecoveryCodesCount)
  const [revealedCodes, setRevealedCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)

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
    setRecoveryCodesCount(0)
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

  async function generateCodes() {
    setError('')
    setBusy(true)
    const res = await genererCodesSecours()
    setBusy(false)
    if (res.error || !res.codes) { setError(res.error || 'Erreur'); return }
    setRevealedCodes(res.codes)
    setRecoveryCodesCount(res.codes.length)
    setCopied(false)
  }

  function copyCodes() {
    if (!revealedCodes) return
    navigator.clipboard.writeText(revealedCodes.join('\n')).then(() => setCopied(true))
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: 15 }}><ShieldCheck className="w-4 h-4" /> Double authentification (2FA)</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Protège le compte admin même si le mot de passe fuite, avec une application comme Google Authenticator.
      </p>

      {factors.length > 0 && !enrolling && !revealedCodes && (
        <div className="space-y-3">
          <div className="space-y-2">
            {factors.map(f => (
              <div key={f.id} className="surface p-3 flex items-center justify-between gap-3">
                <span style={{ fontSize: 13 }}><Check className="w-3.5 h-3.5 inline mr-1" style={{ color: 'var(--sage)' }} /> {f.friendlyName} — activée</span>
                <button disabled={busy} onClick={() => remove(f.id)} className="text-xs" style={{ color: '#dc2626' }}>Désactiver</button>
              </div>
            ))}
          </div>

          <div className="surface p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Codes de secours</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {recoveryCodesCount > 0 ? `${recoveryCodesCount} code(s) non utilisé(s)` : 'Aucun code généré — à faire si tu perds ton téléphone'}
                </div>
              </div>
              <button disabled={busy} onClick={generateCodes} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--brand)' }}>
                <RefreshCw className="w-3.5 h-3.5" /> {recoveryCodesCount > 0 ? 'Régénérer' : 'Générer'} les codes
              </button>
            </div>
          </div>
        </div>
      )}

      {revealedCodes && (
        <div className="space-y-3">
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Note ces 8 codes de secours dans un endroit sûr (gestionnaire de mots de passe). Chacun ne fonctionne qu&apos;une fois et permet de te reconnecter si tu perds l&apos;accès à ton application d&apos;authentification. Les anciens codes ne fonctionnent plus.
          </p>
          <div className="surface p-3 font-mono grid grid-cols-2 gap-2" style={{ fontSize: 13 }}>
            {revealedCodes.map(c => <span key={c}>{c}</span>)}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={copyCodes} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copié !' : 'Copier les codes'}
            </button>
            <button onClick={() => setRevealedCodes(null)} className="btn-brand" style={{ padding: '8px 16px' }}>J&apos;ai bien noté mes codes</button>
          </div>
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
