'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, KeyRound, Check, Users, Download, Trash2, AlertTriangle } from 'lucide-react'
import {
  updateMesInfos, updateNomCouple, changerMonMotDePasse,
  exporterMesReponses, supprimerMonCompte,
} from '@/app/actions/compte'
import { createClient } from '@/lib/supabase/client'

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
        <DangerZoneCard />
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

function DangerZoneCard() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setDownloading(true)
    setError('')
    const res = await exporterMesReponses()
    setDownloading(false)
    if ('error' in res) { setError(res.error); return }
    const blob = new Blob([res.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    const res = await supprimerMonCompte()
    if (res.error) {
      setDeleting(false)
      setError(res.error)
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="card p-6" style={{ borderColor: '#fca5a5' }}>
      <div className="flex items-center gap-2 mb-4">
        <Trash2 className="w-4 h-4 text-red-600" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">Supprimer mon compte</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Cette action est définitive et efface tes informations, tes réponses et l&apos;accès à ton espace YES BOX.</p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-sm py-2 px-4 rounded-lg font-medium flex items-center gap-2" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
          <Trash2 className="w-4 h-4" /> Supprimer mon compte
        </button>
      ) : (
        <div className="p-4 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Cette action est <strong>irréversible</strong>. Une fois ton compte supprimé, tes réponses et ta progression disparaissent définitivement — pense à les télécharger avant de continuer.
            </p>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={download} disabled={downloading} className="text-sm py-2 px-4 rounded-lg font-medium flex items-center gap-2" style={{ background: 'white', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <Download className="w-4 h-4" /> {downloading ? 'Préparation…' : 'Télécharger mes réponses'}
            </button>
            <button onClick={confirmDelete} disabled={deleting} className="text-sm py-2 px-4 rounded-lg font-medium text-white" style={{ background: '#dc2626' }}>
              {deleting ? 'Suppression…' : 'Confirmer la suppression définitive'}
            </button>
            <button onClick={() => setOpen(false)} disabled={deleting} className="text-sm py-2 px-4 rounded-lg font-medium" style={{ background: 'white', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
