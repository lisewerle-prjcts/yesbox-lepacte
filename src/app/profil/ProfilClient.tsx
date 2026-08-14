'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfil, updateCoupleAnniversaire } from '@/app/actions/profil'
import { getProchainAnniversaire } from '@/lib/anniversaires'
import { createClient } from '@/lib/supabase/client'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { User, Heart, KeyRound, Check } from 'lucide-react'

interface Profile { id: string; email: string; prenom: string | null; nom: string | null; couple_id: string | null }
interface Couple { pairing_code: string | null; date_anniversaire: string | null }

function SaveButton({ label = 'Enregistrer' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary flex items-center gap-2">
      {pending && <Spinner size="sm" />}
      {pending ? 'Enregistrement…' : label}
    </button>
  )
}

export default function ProfilClient({ profile, couple }: { profile: Profile; couple: Couple | null }) {
  const [infoError, setInfoError] = useState<string | null>(null)
  const [infoSaved, setInfoSaved] = useState(false)

  const [coupleError, setCoupleError] = useState<string | null>(null)
  const [coupleSaved, setCoupleSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaved, setPwdSaved] = useState(false)

  async function handleInfoSubmit(formData: FormData) {
    setInfoError(null)
    setInfoSaved(false)
    const result = await updateProfil(formData)
    if (result.error) { setInfoError(result.error); return }
    setInfoSaved(true)
    setTimeout(() => setInfoSaved(false), 3000)
  }

  async function handleCoupleSubmit(formData: FormData) {
    setCoupleError(null)
    setCoupleSaved(false)
    const result = await updateCoupleAnniversaire(formData)
    if (result.error) { setCoupleError(result.error); return }
    setCoupleSaved(true)
    setTimeout(() => setCoupleSaved(false), 3000)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null)
    setPwdSaved(false)

    if (newPassword.length < 8) {
      setPwdError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Les mots de passe ne correspondent pas')
      return
    }

    setPwdLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwdLoading(false)

    if (error) { setPwdError(error.message); return }
    setPwdSaved(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwdSaved(false), 3000)
  }

  const prochainAnniversaire = couple?.date_anniversaire ? getProchainAnniversaire(couple.date_anniversaire) : null

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="font-fraunces text-3xl font-bold text-gray-900">Ton profil</h1>
        <p className="text-gray-500">Vérifie et corrige tes informations.</p>
      </div>

      {/* Informations personnelles */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-magenta" />
          <h2 className="font-fraunces text-lg font-bold text-gray-900">Tes informations</h2>
        </div>

        {infoError && <Alert type="error" message={infoError} className="mb-4" />}

        <form action={handleInfoSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={profile.email} disabled className="input-field opacity-60" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prenom" className="label">Prénom</label>
              <input id="prenom" name="prenom" type="text" defaultValue={profile.prenom || ''} required className="input-field" autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="nom" className="label">Nom</label>
              <input id="nom" name="nom" type="text" defaultValue={profile.nom || ''} className="input-field" autoComplete="family-name" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveButton />
            {infoSaved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Enregistré</span>}
          </div>
        </form>
      </div>

      {/* Couple */}
      {profile.couple_id && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-4 h-4 text-magenta" />
            <h2 className="font-fraunces text-lg font-bold text-gray-900">Votre couple</h2>
          </div>

          {couple?.pairing_code && (
            <div className="mb-4">
              <label className="label">Code de votre pacte</label>
              <p className="font-mono font-bold tracking-widest text-magenta text-lg">{couple.pairing_code}</p>
            </div>
          )}

          {coupleError && <Alert type="error" message={coupleError} className="mb-4" />}

          <form action={handleCoupleSubmit} className="space-y-4">
            <div>
              <label htmlFor="date_anniversaire" className="label">Date de couple</label>
              <input
                id="date_anniversaire"
                name="date_anniversaire"
                type="date"
                defaultValue={couple?.date_anniversaire || ''}
                className="input-field"
              />
            </div>

            {prochainAnniversaire && (
              <p className="text-sm text-gray-500">
                Prochain anniversaire le{' '}
                <strong className="text-gray-700">
                  {prochainAnniversaire.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
                {' '}— vos <strong className="text-gray-700">{prochainAnniversaire.years}</strong> an{prochainAnniversaire.years > 1 ? 's' : ''}, les{' '}
                <span className="text-magenta font-semibold">noces de {prochainAnniversaire.matiere}</span>.
              </p>
            )}

            <div className="flex items-center gap-3">
              <SaveButton />
              {coupleSaved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Enregistré</span>}
            </div>
          </form>
        </div>
      )}

      {/* Mot de passe */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-magenta" />
          <h2 className="font-fraunces text-lg font-bold text-gray-900">Mot de passe</h2>
        </div>

        {pwdError && <Alert type="error" message={pwdError} className="mb-4" />}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new_password" className="label">Nouveau mot de passe</label>
              <input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="confirm_password" className="label">Confirmer</label>
              <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retape le mot de passe"
                autoComplete="new-password"
                required
                className="input-field"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pwdLoading} className="btn-primary flex items-center gap-2">
              {pwdLoading && <Spinner size="sm" />}
              {pwdLoading ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
            {pwdSaved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Mot de passe changé</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
