'use client'

import { useState } from 'react'
import { User, KeyRound, Check, Users, Copy } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'
import {
  updateMesInfos, updateNomCouple, changerMonMotDePasse,
} from '@/app/actions/compte'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function MonCompteClient({
  nom, prenom, email, nomCouple, pairingCode, paired,
}: {
  nom: string
  prenom: string
  email: string
  nomCouple: string
  pairingCode: string | null
  paired: boolean
}) {
  const t = useT()
  return (
    <div className="fade" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl font-bold text-gray-900 mb-1">{t('Mon compte', 'My Account')}</h1>
        <p className="text-gray-500 text-sm">{t('Gère tes informations et ton mot de passe.', 'Manage your information and your password.')}</p>
      </div>

      <div className="space-y-5">
        <MesInfosCard nom={nom} prenom={prenom} email={email} />
        <CoupleCard nomCouple={nomCouple} pairingCode={pairingCode} paired={paired} />
        <PasswordCard />
      </div>
    </div>
  )
}

function MesInfosCard({ nom: initialNom, prenom: initialPrenom, email }: { nom: string; prenom: string; email: string }) {
  const t = useT()
  const [nom, setNom] = useState(initialNom)
  const [prenom, setPrenom] = useState(initialPrenom)
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function save() {
    setStatus('saving')
    const res = await updateMesInfos(nom, prenom)
    setStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Mes informations', 'My Information')}</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4 font-mono">{email}</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">{t('Prénom', 'First name')}</label>
          <input type="text" className="input-field" value={prenom} onChange={e => setPrenom(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('Nom', 'Last name')}</label>
          <input type="text" className="input-field" value={nom} onChange={e => setNom(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={status === 'saving'} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        {status === 'saving' ? t('Sauvegarde…', 'Saving…') : status === 'saved' ? <><Check className="w-4 h-4" /> {t('Sauvegardé', 'Saved')}</> : status === 'error' ? t('Erreur — réessaie', 'Error — try again') : t('Sauvegarder', 'Save')}
      </button>
    </div>
  )
}

function CoupleCard({ nomCouple: initialNom, pairingCode, paired }: { nomCouple: string; pairingCode: string | null; paired: boolean }) {
  const t = useT()
  const [nomCouple, setNomCouple] = useState(initialNom)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function save() {
    setError('')
    setStatus('saving')
    const res = await updateNomCouple(nomCouple)
    if (res.error) {
      setError(res.error)
      setStatus('error')
    } else {
      setStatus('saved')
    }
    setTimeout(() => setStatus('idle'), 2500)
  }

  async function copyCode() {
    if (!pairingCode) return
    await navigator.clipboard.writeText(pairingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Notre couple', 'Our Couple')}</h2>
      </div>

      {pairingCode && (
        <div className="mb-4 max-w-xs">
          <label className="label">{t('Code couple', 'Couple code')} {paired ? <span className="text-gray-400 font-normal">{t('(déjà pairé·es)', '(already paired)')}</span> : <span className="text-gray-400 font-normal">{t('(à partager avec ton/ta partenaire)', '(share it with your partner)')}</span>}</label>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ fontSize: 20, letterSpacing: '.2em' }}>{pairingCode}</span>
            <button onClick={copyCode} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('Copié', 'Copied') : t('Copier', 'Copy')}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <label className="label">{t('Nom du couple', 'Couple name')} <span className="text-gray-400 font-normal">{t('(optionnel)', '(optional)')}</span></label>
        <input type="text" className="input-field" placeholder={t('Ex : Marie & Pierre', 'e.g. Mary & Peter')} value={nomCouple} onChange={e => setNomCouple(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <button onClick={save} disabled={status === 'saving'} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        {status === 'saving' ? t('Sauvegarde…', 'Saving…') : status === 'saved' ? <><Check className="w-4 h-4" /> {t('Sauvegardé', 'Saved')}</> : status === 'error' ? t('Erreur — réessaie', 'Error — try again') : t('Sauvegarder', 'Save')}
      </button>
    </div>
  )
}

function PasswordCard() {
  const t = useT()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (next !== confirm) { setError(t('Les deux mots de passe ne correspondent pas', 'The two passwords do not match')); return }
    if (next.length < 8) { setError(t('Le nouveau mot de passe doit contenir au moins 8 caractères', 'The new password must be at least 8 characters long')); return }
    setStatus('saving')
    const res = await changerMonMotDePasse(current, next)
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
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Réinitialiser mon mot de passe', 'Reset My Password')}</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="label">{t('Mot de passe actuel', 'Current password')}</label>
          <input type="password" className="input-field" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('Nouveau mot de passe', 'New password')}</label>
          <input type="password" className="input-field" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('Confirmer', 'Confirm')}</label>
          <input type="password" className="input-field" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <button
        onClick={submit}
        disabled={status === 'saving' || !current || !next || !confirm}
        className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
      >
        {status === 'saving' ? t('Modification…', 'Updating…') : status === 'saved' ? <><Check className="w-4 h-4" /> {t('Modifié', 'Updated')}</> : t('Modifier le mot de passe', 'Change Password')}
      </button>
    </div>
  )
}
