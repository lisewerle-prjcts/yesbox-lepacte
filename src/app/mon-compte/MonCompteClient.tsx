'use client'

import { useState } from 'react'
import { User, KeyRound, Check, Users, Copy, CreditCard, AlertTriangle, Gift, Download, Trash2 } from 'lucide-react'
import { useT, useLocale } from '@/components/i18n/LocaleContext'
import {
  updateMesInfos, updateNomCouple, changerMonMotDePasse, telechargerMesDonnees, supprimerMonCompte,
} from '@/app/actions/compte'
import { annulerAbonnement, reprendreAbonnement, utiliserCodeGratuit } from '@/app/actions/abonnement'
import type { CoupleAbonnement } from '@/types'
import { estCompteResilie, aAccesGratuitActif } from '@/lib/abonnement'
import { ACCES_GRATUIT_ILLIMITE_ISO } from '@/lib/dates'
import Link from 'next/link'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function MonCompteClient({
  nom, prenom, email, nomCouple, pairingCode, paired, abonnement, codeParrainage, filleulsCount,
}: {
  nom: string
  prenom: string
  email: string
  nomCouple: string
  pairingCode: string | null
  paired: boolean
  abonnement: CoupleAbonnement | null
  codeParrainage: string | null
  filleulsCount: number
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
        <AbonnementCard abonnement={abonnement} />
        <ParrainageCard codeParrainage={codeParrainage} filleulsCount={filleulsCount} />
        <PasswordCard />
        <MesDonneesCard />
        <SupprimerCompteCard />
      </div>
    </div>
  )
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function AbonnementCard({ abonnement }: { abonnement: CoupleAbonnement | null }) {
  const t = useT()
  const { locale } = useLocale()
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  const actif = abonnement?.subscription_status === 'actif'
  const annuleAPeriodeFin = !!abonnement?.subscription_cancel_at_period_end
  const compteResilie = estCompteResilie(abonnement)
  const gratuitActif = !actif && aAccesGratuitActif(abonnement)
  const gratuitIllimite = abonnement?.acces_gratuit_expire_le === ACCES_GRATUIT_ILLIMITE_ISO

  async function stopper() {
    setError('')
    setStatus('saving')
    const res = await annulerAbonnement()
    if (res.error) { setError(res.error); setStatus('error'); return }
    setStatus('saved')
  }

  async function reprendre() {
    setError('')
    setStatus('saving')
    const res = await reprendreAbonnement()
    if (res.error) { setError(res.error); setStatus('error'); return }
    setStatus('saved')
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Abonnement', 'Subscription')}</h2>
      </div>

      {compteResilie ? (
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#fdf2f2' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#c0392b' }} />
          <p className="text-sm" style={{ color: '#8a2c2c' }}>
            {t(
              "Ce compte a été résilié après 18 mois sans abonnement actif. L'abonnement ne peut plus être réactivé ici : il faut recommencer avec un nouveau compte.",
              'This account was closed after 18 months without an active subscription. It can no longer be reactivated here: you need to start over with a new account.'
            )}
          </p>
        </div>
      ) : actif ? (
        <>
          <p className="text-sm text-gray-600 mb-1">
            {annuleAPeriodeFin
              ? t('Résilié — accès actif jusqu’au', 'Canceled — access active until')
              : t('Prochain renouvellement automatique le', 'Next automatic renewal on')}
            {' '}
            <strong>{abonnement?.subscription_current_period_end ? formatDate(abonnement.subscription_current_period_end, locale) : '—'}</strong>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {annuleAPeriodeFin
              ? t('Après cette date, seules les parties déjà réalisées restent consultables.', 'After this date, only the parts you already completed remain viewable.')
              : t('29€/mois · résiliable à tout moment.', '€29/month · cancel anytime.')}
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {annuleAPeriodeFin ? (
            <button onClick={reprendre} disabled={status === 'saving'} className="btn-secondary text-sm py-2 px-4">
              {status === 'saving' ? t('Reprise…', 'Resuming…') : t('Reprendre l’abonnement', 'Resume subscription')}
            </button>
          ) : (
            <button onClick={stopper} disabled={status === 'saving'} className="btn-ghost text-sm py-2 px-4" style={{ color: '#c0392b' }}>
              {status === 'saving' ? t('Arrêt en cours…', 'Stopping…') : t('Arrêter le renouvellement automatique', 'Stop automatic renewal')}
            </button>
          )}
        </>
      ) : gratuitActif ? (
        <>
          <p className="text-sm text-gray-600 mb-1">
            {gratuitIllimite
              ? t('Accès gratuit illimité', 'Unlimited free access')
              : <>{t('Accès gratuit jusqu’au', 'Free access until')} <strong>{abonnement?.acces_gratuit_expire_le ? formatDate(abonnement.acces_gratuit_expire_le, locale) : '—'}</strong></>}
          </p>
          <p className="text-xs text-gray-400">
            {t('Offert (code testeur ou parrainage) — aucun paiement en cours.', 'Granted (tester code or referral) — no payment in progress.')}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">{t('Aucun abonnement actif pour le moment.', 'No active subscription at the moment.')}</p>
          <Link href="/abonnement" className="btn-primary text-sm py-2 px-4 inline-block">{t('S’abonner', 'Subscribe')}</Link>
          <CodeGratuitForm />
        </>
      )}
    </div>
  )
}

function CodeGratuitForm() {
  const t = useT()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  async function valider() {
    setError('')
    setStatus('saving')
    const res = await utiliserCodeGratuit(code)
    if (res.error) { setError(res.error); setStatus('error'); return }
    setStatus('saved')
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid #eee' }}>
      <label className="label">{t('J’ai un code gratuit', 'I have a free code')}</label>
      <div className="flex items-center gap-2 max-w-xs">
        <input
          type="text"
          className="input-field uppercase"
          placeholder={t('Ex : BETA2026', 'e.g. BETA2026')}
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        <button onClick={valider} disabled={status === 'saving' || !code.trim()} className="btn-secondary text-sm py-2 px-4 flex-shrink-0">
          {status === 'saving' ? t('…', '…') : t('Valider', 'Apply')}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}

function ParrainageCard({ codeParrainage, filleulsCount }: { codeParrainage: string | null; filleulsCount: number }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  if (!codeParrainage) return null

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const lien = `${appUrl}/inscription?parrain=${codeParrainage}`
  const restants = 5 - (filleulsCount % 5)
  const prochainSeuil = restants === 5 ? 0 : restants

  async function copierLien() {
    await navigator.clipboard.writeText(lien)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Parrainage', 'Referrals')}</h2>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {t('Chaque 5 couples parrainés qui s’inscrivent, vous recevez 1 mois offert.', 'For every 5 referred couples who sign up, you get 1 month free.')}
      </p>
      <div className="mb-3 max-w-md">
        <label className="label">{t('Ton lien de parrainage', 'Your referral link')}</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs truncate" style={{ flex: 1 }}>{lien}</span>
          <button onClick={copierLien} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('Copié', 'Copied') : t('Copier', 'Copy')}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        {filleulsCount === 0
          ? t('Aucun couple parrainé pour le moment.', 'No referred couples yet.')
          : prochainSeuil === 0
          ? t(`${filleulsCount} couple(s) parrainé(s) — bravo !`, `${filleulsCount} referred couple(s) — nice!`)
          : t(`${filleulsCount} couple(s) parrainé(s) · encore ${prochainSeuil} avant ton prochain mois offert`, `${filleulsCount} referred couple(s) · ${prochainSeuil} more until your next free month`)}
      </p>
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

function MesDonneesCard() {
  const t = useT()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function telecharger() {
    setStatus('loading')
    const res = await telechargerMesDonnees()
    if ('error' in res) {
      setStatus('error')
      return
    }
    const blob = new Blob([res.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.filename
    a.click()
    URL.revokeObjectURL(url)
    setStatus('idle')
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-2">
        <Download className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Mes données', 'My Data')}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {t(
          'Télécharge tes informations, tes réponses et celles de ton/ta partenaire pour les modules déjà révélés, ainsi que votre pacte.',
          "Download your information, your answers, your partner's answers for modules already revealed, and your pact.",
        )}
      </p>
      <button onClick={telecharger} disabled={status === 'loading'} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        <Download className="w-4 h-4" />
        {status === 'loading' ? t('Préparation…', 'Preparing…') : status === 'error' ? t('Erreur — réessaie', 'Error — try again') : t('Télécharger mes données', 'Download my data')}
      </button>
    </div>
  )
}

function SupprimerCompteCard() {
  const t = useT()
  const [ouvert, setOuvert] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState<string | null>(null)
  const motCle = t('SUPPRIMER', 'DELETE')

  async function supprimer() {
    setError(null)
    setStatus('loading')
    const res = await supprimerMonCompte(motDePasse)
    if (res.error) {
      setError(res.error)
      setStatus('idle')
      return
    }
    window.location.href = '/'
  }

  return (
    <div className="card p-6" style={{ borderColor: '#f5c2c0' }}>
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="w-4 h-4" style={{ color: '#c0392b' }} />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Supprimer mon compte', 'Delete my account')}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {t(
          'Ton compte, tes réponses et tes conclusions seront effacés définitivement. Si ton/ta partenaire garde son compte, votre espace couple reste ouvert, sans tes réponses. Si personne d’autre n’est dans l’espace, il est supprimé et l’abonnement en cours est arrêté immédiatement. Pense à télécharger tes données avant.',
          'Your account, answers and conclusions will be permanently deleted. If your partner keeps their account, your couple space stays open for them, without your answers. If you are alone in the space, it is deleted and any current subscription is stopped immediately. Remember to download your data first.',
        )}
      </p>
      {!ouvert ? (
        <button onClick={() => setOuvert(true)} className="text-sm font-semibold py-2 px-4 rounded-lg" style={{ border: '1px solid #c0392b', color: '#c0392b' }}>
          {t('Supprimer mon compte', 'Delete my account')}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">{t('Ton mot de passe', 'Your password')}</label>
            <input type="password" className="input-field" autoComplete="current-password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
          </div>
          <div>
            <label className="label">{t(`Tape ${motCle} pour confirmer`, `Type ${motCle} to confirm`)}</label>
            <input type="text" className="input-field" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
          </div>
          {error && <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={supprimer}
              disabled={status === 'loading' || !motDePasse || confirmation.trim().toUpperCase() !== motCle}
              className="text-sm font-semibold py-2 px-4 rounded-lg text-white disabled:opacity-40"
              style={{ background: '#c0392b' }}
            >
              {status === 'loading' ? t('Suppression…', 'Deleting…') : t('Supprimer définitivement', 'Delete permanently')}
            </button>
            <button onClick={() => { setOuvert(false); setError(null) }} className="text-sm py-2 px-4 text-gray-500">
              {t('Annuler', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
