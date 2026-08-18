'use client'

import { useState } from 'react'
import { User, KeyRound, Check, Users } from 'lucide-react'
import {
  updateMesInfos, updateNomCouple, changerMonMotDePasse,
} from '@/app/actions/compte'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function MonCompteClient({
  nom, prenom, email, nomCouple,
}: {
  nom: string
  prenom: string
  email: string
  nomCouple: string
}) {
  return (
    <div className="fade" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl font-bold text-gray-900 mb-1">Mon compte</h1>
        <p className="text-gray-500 text-sm">Gère tes informations et ton mot de passe.</p>
      </div>

      <div className="space-y-5">
        <MesInfosCard nom={nom} prenom={prenom} email={email} />
        <CoupleCard nomCouple={nomCouple} />
        <PasswordCard />
      </div>
    </div>
  )
}

function MesInfosCard({ nom: initialNom, prenom: initialPrenom, email }: { nom: string; prenom: string; email: string }) {
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
        <h2 className="font-fraunces text-lg font-bold text-gray-900">Mes informations</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4 font-mono">{email}</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Prénom</label>
          <input type="text" className="input-field" value={prenom} onChange={e => setPrenom(e.target.value)} />
        </div>
        <div>
          <label className="label">Nom</label>
          <input type="text" className="input-field" value={nom} onChange={e => setNom(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={status === 'saving'} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        {status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? <><Check className="w-4 h-4" /> Sauvegardé</> : status === 'error' ? 'Erreur — réessaie' : 'Sauvegarder'}
      </button>
    </div>
  )
}

function CoupleCard({ nomCouple: initialNom }: { nomCouple: string }) {
  const [nomCouple, setNomCouple] = useState(initialNom)
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function save() {
    setStatus('saving')
    const res = await updateNomCouple(nomCouple)
    setStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">Notre couple</h2>
      </div>
      <div className="mb-4 max-w-xs">
        <label className="label">Nom du couple <span className="text-gray-400 font-normal">(optionnel)</span></label>
        <input type="text" className="input-field" placeholder="Ex : Marie & Pierre" value={nomCouple} onChange={e => setNomCouple(e.target.value)} />
      </div>
      <button onClick={save} disabled={status === 'saving'} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        {status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? <><Check className="w-4 h-4" /> Sauvegardé</> : status === 'error' ? 'Erreur — réessaie' : 'Sauvegarder'}
      </button>
    </div>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (next !== confirm) { setError('Les deux mots de passe ne correspondent pas'); return }
    if (next.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères'); return }
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
        <h2 className="font-fraunces text-lg font-bold text-gray-900">Réinitialiser mon mot de passe</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="label">Mot de passe actuel</label>
          <input type="password" className="input-field" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input type="password" className="input-field" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirmer</label>
          <input type="password" className="input-field" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <button
        onClick={submit}
        disabled={status === 'saving' || !current || !next || !confirm}
        className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
      >
        {status === 'saving' ? 'Modification…' : status === 'saved' ? <><Check className="w-4 h-4" /> Modifié</> : 'Modifier le mot de passe'}
      </button>
    </div>
  )
}
