'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { changerMotDePasse, deconnecterAutresAppareils } from '@/app/actions/security'
import { Check, ShieldCheck } from 'lucide-react'

export default function SecuriteForm() {
  const [isPendingPwd, startPwd] = useTransition()
  const [isPendingLogout, startLogout] = useTransition()
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [logoutDone, setLogoutDone] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  function onSubmitPwd(formData: FormData) {
    setPwdError(null)
    const nouveau = formData.get('nouveau_mdp') as string
    const confirmation = formData.get('confirmation_mdp') as string
    if (nouveau !== confirmation) {
      setPwdError('Les deux mots de passe ne correspondent pas.')
      return
    }
    startPwd(async () => {
      const res = await changerMotDePasse(nouveau)
      if (res?.error) setPwdError(res.error)
      else {
        setPwdSaved(true)
        setTimeout(() => setPwdSaved(false), 2500)
      }
    })
  }

  function onLogoutOthers() {
    setLogoutError(null)
    startLogout(async () => {
      const res = await deconnecterAutresAppareils()
      if (res?.error) setLogoutError(res.error)
      else setLogoutDone(true)
    })
  }

  return (
    <div className="card p-6 flex flex-col gap-6 mt-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        <h2 className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--ink)' }}>Sécurité</h2>
      </div>

      <form action={onSubmitPwd} className="flex flex-col gap-3">
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input type="password" name="nouveau_mdp" className="input-field" minLength={8} required autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirmer le mot de passe</label>
          <input type="password" name="confirmation_mdp" className="input-field" minLength={8} required autoComplete="new-password" />
        </div>
        {pwdError && <p style={{ color: '#dc2626', fontSize: 13 }}>{pwdError}</p>}
        <button type="submit" disabled={isPendingPwd} className="btn-brand flex items-center justify-center gap-2" style={{ alignSelf: 'flex-start' }}>
          {pwdSaved ? <><Check className="w-4 h-4" />Mot de passe modifié</> : isPendingPwd ? 'Enregistrement…' : 'Changer mon mot de passe'}
        </button>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />

      <div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>Mot de passe oublié ?</p>
        <Link href="/mot-de-passe-oublie" style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>Réinitialiser par email →</Link>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />

      <div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
          Déconnecte ton compte de tous les autres appareils et navigateurs (celui-ci reste connecté).
        </p>
        {logoutError && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{logoutError}</p>}
        <button type="button" onClick={onLogoutOthers} disabled={isPendingLogout || logoutDone} className="btn-ghost flex items-center gap-2">
          {logoutDone ? <><Check className="w-4 h-4" />Autres appareils déconnectés</> : isPendingLogout ? 'Déconnexion…' : 'Déconnecter les autres appareils'}
        </button>
      </div>
    </div>
  )
}
