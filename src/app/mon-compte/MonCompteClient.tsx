'use client'

import { useState } from 'react'
import { User, KeyRound, Check, Users, Copy, CreditCard, AlertTriangle, Gift, Download, Upload, Trash2, Mail, Languages, Ticket } from 'lucide-react'
import { useT, useLocale } from '@/components/i18n/LocaleContext'
import {
  updateMesInfos, updateNomCouple, changerMonMotDePasse, telechargerMesDonnees, importerMesDonnees, supprimerMonCompte,
} from '@/app/actions/compte'
import { changerRappelsEmail } from '@/app/actions/rappels'
import { memoriserLangue } from '@/app/actions/langue'
import { annulerAbonnement, reprendreAbonnement, annulerBasculeAnnuelle, utiliserCode } from '@/app/actions/abonnement'
import type { CoupleAbonnement } from '@/types'
import { estCompteResilie, aAccesGratuitActif } from '@/lib/abonnement'
import { ACCES_GRATUIT_ILLIMITE_ISO } from '@/lib/dates'
import Link from 'next/link'
import ChampCode from '@/components/ChampCode'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function MonCompteClient({
  prenom, email, nomCouple, pairingCode, paired, abonnement, formule, annuelPrevuLe, proposerAnnuel, codeParrainage, filleulsCount, rappelsEmail, langue,
}: {
  prenom: string
  email: string
  nomCouple: string
  pairingCode: string | null
  paired: boolean
  abonnement: CoupleAbonnement | null
  formule: 'mensuel' | 'annuel' | null
  /** Bascule programmée vers le rendez-vous annuel (fin du mois en cours). */
  annuelPrevuLe: string | null
  /** Pacte signé et abonnement mensuel en cours : proposer la bascule. */
  proposerAnnuel: boolean
  codeParrainage: string | null
  filleulsCount: number
  rappelsEmail: boolean
  /** Langue préférée enregistrée sur le profil (site et e-mails). */
  langue: 'fr' | 'en'
}) {
  const t = useT()
  return (
    <div className="fade" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl font-bold text-gray-900 mb-1">{t('Mon compte', 'My Account')}</h1>
        <p className="text-gray-500 text-sm">{t('Gère tes informations et ton mot de passe.', 'Manage your information and your password.')}</p>
      </div>

      <div className="space-y-5">
        <MesInfosCard prenom={prenom} email={email} />
        <CoupleCard nomCouple={nomCouple} pairingCode={pairingCode} paired={paired} />
        <AbonnementCard abonnement={abonnement} formule={formule} annuelPrevuLe={annuelPrevuLe} proposerAnnuel={proposerAnnuel} />
        {!estCompteResilie(abonnement) && <AjouterCodeCard />}
        <ParrainageCard codeParrainage={codeParrainage} filleulsCount={filleulsCount} />
        <LangueCard langueInitiale={langue} />
        <RappelsCard actifInitial={rappelsEmail} />
        <PasswordCard />
        <MesDonneesCard />
        <ImporterDonneesCard />
        <SupprimerCompteCard />
      </div>
    </div>
  )
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function LangueCard({ langueInitiale }: { langueInitiale: 'fr' | 'en' }) {
  const t = useT()
  const { setLocale } = useLocale()
  const [langue, setLangue] = useState(langueInitiale)
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function choisir(next: 'fr' | 'en') {
    if (next === langue) return
    setStatus('saving')
    setLangue(next)
    await memoriserLangue(next)
    // Bascule aussi le site dans cette langue.
    setLocale(next)
    setStatus('saved')
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Languages className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Langue préférée', 'Preferred language')}</h2>
      </div>
      <div role="radiogroup" className="flex flex-col gap-2">
        {([['fr', 'Français'], ['en', 'English']] as const).map(([code, libelle]) => (
          <label key={code} className="flex items-center gap-3 cursor-pointer text-sm text-gray-700">
            <input type="radio" name="langue" checked={langue === code} disabled={status === 'saving'} onChange={() => choisir(code)} />
            {libelle}
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {t('Langue du site et des e-mails que YES BOX t’envoie.', 'Language of the site and of the emails YES BOX sends you.')}
      </p>
    </div>
  )
}

function RappelsCard({ actifInitial }: { actifInitial: boolean }) {
  const t = useT()
  const [actif, setActif] = useState(actifInitial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  async function basculer(valeur: boolean) {
    setError('')
    setStatus('saving')
    setActif(valeur)
    const res = await changerRappelsEmail(valeur)
    if (res.error) { setError(res.error); setActif(!valeur); setStatus('error'); return }
    setStatus('saved')
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('E-mails de rappel', 'Reminder emails')}</h2>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={actif} disabled={status === 'saving'} onChange={e => basculer(e.target.checked)} className="mt-1" />
        <span className="text-sm text-gray-600">
          {t(
            'Recevoir les rappels YES BOX : quand votre parcours est en pause depuis 10 jours, puis tous les mois une fois votre pacte signé (2 par mois maximum).',
            'Receive YES BOX reminders: when your program has been paused for 10 days, then every month once your pact is signed (2 per month at most).'
          )}
        </span>
      </label>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}

function AbonnementCard({ abonnement, formule, annuelPrevuLe, proposerAnnuel }: { abonnement: CoupleAbonnement | null; formule: 'mensuel' | 'annuel' | null; annuelPrevuLe: string | null; proposerAnnuel: boolean }) {
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

  async function garderMensuel() {
    setError('')
    setStatus('saving')
    const res = await annulerBasculeAnnuelle()
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
              "Ce compte a été clos. L'abonnement ne peut plus être réactivé ici : il faut recommencer avec un nouveau compte.",
              'This account was closed. It can no longer be reactivated here: you need to start over with a new account.'
            )}
          </p>
        </div>
      ) : actif ? (
        <>
          {formule === 'annuel' && (
            <p className="text-sm font-semibold text-gray-900 mb-1">{t('Pacte – notre rendez-vous annuel', 'Pact – our yearly date')}</p>
          )}
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
              : formule === 'annuel'
              ? t('19€/an · résiliable à tout moment.', '€19/year · cancel anytime.')
              : t('29€/mois · résiliable à tout moment.', '€29/month · cancel anytime.')}
          </p>
          {annuelPrevuLe && formule !== 'annuel' && !annuleAPeriodeFin && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'var(--brand-tint, #fdeef4)' }}>
              <p className="text-gray-700 mb-2">
                {t('Passage à « Pacte – notre rendez-vous annuel » prévu le', 'Switch to "Pact – our yearly date" scheduled on')}{' '}
                <strong>{formatDate(annuelPrevuLe, locale)}</strong>
                {t(' : 19€ seront prélevés ce jour-là, pour 1 an d’accès.', ': €19 will be charged that day, for 1 year of access.')}
              </p>
              <button onClick={garderMensuel} disabled={status === 'saving'} className="btn-ghost text-sm py-1 px-3">
                {t('Rester au mensuel', 'Stay on monthly')}
              </button>
            </div>
          )}
          {proposerAnnuel && (
            <p className="text-sm mb-4">
              <Link href="/journal#rdv-annuel-offre" className="text-magenta font-semibold">
                {t('Votre pacte est signé : passer au rendez-vous annuel (19€/an)', 'Your pact is signed: switch to the yearly date (€19/year)')}
              </Link>
            </p>
          )}
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
            {t('Offert (carte cadeau, code gratuit ou parrainage) — aucun paiement en cours.', 'Granted (gift card, free code or referral) — no payment in progress.')}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">{t('Aucun abonnement actif pour le moment.', 'No active subscription at the moment.')}</p>
          <Link href="/abonnement" className="btn-primary text-sm py-2 px-4 inline-block">{t('S’abonner', 'Subscribe')}</Link>
        </>
      )}
    </div>
  )
}

// Carte cadeau, code de parrainage (si le couple s'est inscrit sans) ou code
// gratuit : utilisable à tout moment, même après l'inscription ou pendant un
// abonnement en cours (cf. utiliserCode).
function AjouterCodeCard() {
  const t = useT()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function valider() {
    setError('')
    setMessage('')
    setStatus('saving')
    const res = await utiliserCode(code)
    if ('error' in res) { setError(res.error); setStatus('error'); return }
    setMessage(res.message)
    setCode('')
    setStatus('saved')
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Ajouter un code', 'Add a code')}</h2>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {t(
          'Une carte cadeau reçue, le code du couple qui vous a parrainés si vous ne l’avez pas saisi à l’inscription, ou un code gratuit : ajoutez-le ici, à tout moment.',
          'A gift card you received, the code of the couple who referred you if you didn’t enter it when signing up, or a free code: add it here, at any time.'
        )}
      </p>
      <div className="flex items-center gap-2 max-w-sm">
        <ChampCode
          placeholder={t('Ex : YES-AB12-CD34', 'e.g. YES-AB12-CD34')}
          value={code}
          onChange={setCode}
          onEntree={() => { if (code.trim() && status !== 'saving') valider() }}
        />
        <button onClick={valider} disabled={status === 'saving' || !code.trim()} className="btn-secondary text-sm py-2 px-4 flex-shrink-0">
          {status === 'saving' ? '…' : t('Valider', 'Apply')}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {message && <p className="text-sm text-green-700 mt-2 flex items-center gap-1.5"><Check className="w-4 h-4" /> {message}</p>}
    </div>
  )
}

function ParrainageCard({ codeParrainage, filleulsCount }: { codeParrainage: string | null; filleulsCount: number }) {
  const t = useT()
  const [copie, setCopie] = useState<'code' | 'lien' | null>(null)
  if (!codeParrainage) return null

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const lien = `${appUrl}/inscription?parrain=${codeParrainage}`
  const restants = 5 - (filleulsCount % 5)
  const prochainSeuil = restants === 5 ? 0 : restants

  async function copier(quoi: 'code' | 'lien') {
    await navigator.clipboard.writeText(quoi === 'code' ? codeParrainage! : lien)
    setCopie(quoi)
    setTimeout(() => setCopie(null), 2500)
  }

  const boutonCopier = (quoi: 'code' | 'lien') => (
    <button onClick={() => copier(quoi)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0">
      {copie === quoi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copie === quoi ? t('Copié', 'Copied') : t('Copier', 'Copy')}
    </button>
  )

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Parrainage', 'Referrals')}</h2>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {t('Chaque 5 couples parrainés qui s’inscrivent, vous recevez 1 mois offert, ou un an offert si vous avez signé votre pacte et terminé le programme initial.', 'For every 5 referred couples who sign up, you get 1 month free, or a year free if you have signed your pact and completed the initial program.')}
      </p>
      <div className="mb-3 max-w-md">
        <label className="label">{t('Ton code parrain', 'Your referral code')}</label>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold" style={{ fontSize: 20, letterSpacing: '.2em' }}>{codeParrainage}</span>
          {boutonCopier('code')}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {t('À donner au couple que tu parraines, à saisir lors de l’inscription, ou plus tard dans leur compte (« Ajouter un code »).', 'To give to the couple you refer, to enter when signing up, or later in their account ("Add a code").')}
        </p>
      </div>
      <div className="mb-3 max-w-md">
        <label className="label">{t('Ton lien de parrainage', 'Your referral link')}</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs truncate" style={{ flex: 1 }}>{lien}</span>
          {boutonCopier('lien')}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        {filleulsCount === 0
          ? t('Aucun couple parrainé pour le moment.', 'No referred couples yet.')
          : prochainSeuil === 0
          ? t(`${filleulsCount} couple(s) parrainé(s) — bravo !`, `${filleulsCount} referred couple(s) — nice!`)
          : t(`${filleulsCount} couple(s) parrainé(s) · encore ${prochainSeuil} avant ta prochaine récompense`, `${filleulsCount} referred couple(s) · ${prochainSeuil} more until your next reward`)}
      </p>
    </div>
  )
}

function MesInfosCard({ prenom: initialPrenom, email }: { prenom: string; email: string }) {
  const t = useT()
  const [prenom, setPrenom] = useState(initialPrenom)
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function save() {
    setStatus('saving')
    const res = await updateMesInfos(prenom)
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

function ImporterDonneesCard() {
  const t = useT()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function importer(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    if (fichier.size > 4 * 1024 * 1024) {
      setStatus('error')
      setMessage(t('Ce fichier est trop volumineux.', 'This file is too large.'))
      return
    }
    setStatus('loading')
    setMessage(null)
    const res = await importerMesDonnees(await fichier.text())
    if ('error' in res) {
      setStatus('error')
      setMessage(res.error ?? null)
      return
    }
    setStatus('done')
    const bilan = t(
      `${res.reponses} réponse(s) et ${res.conclusions} conclusion(s) retrouvée(s), ${res.modulesReveles} module(s) révélé(s) restauré(s).`,
      `${res.reponses} answer(s) and ${res.conclusions} conclusion(s) recovered, ${res.modulesReveles} revealed module(s) restored.`,
    )
    setMessage(res.partenaireManquant
      ? `${bilan} ${t(
          'Ton/ta partenaire n’est pas encore de retour dans votre espace : ses réponses et votre progression seront restaurées si tu réimportes ce fichier une fois vos comptes pairés.',
          'Your partner is not back in your space yet: their answers and your progress will be restored if you import this file again once your accounts are paired.',
        )}`
      : bilan)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-2">
        <Upload className="w-4 h-4 text-magenta" />
        <h2 className="font-fraunces text-lg font-bold text-gray-900">{t('Retrouver mes réponses', 'Restore my answers')}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {t(
          'Tu reviens après une désinscription ? Importe le fichier téléchargé depuis « Mes données » pour retrouver vos réponses, votre journal et votre pacte. Rien de ce que vous avez déjà écrit depuis votre retour n’est remplacé.',
          'Coming back after unsubscribing? Import the file downloaded from "My data" to get back your answers, your journal and your pact. Nothing you have written since coming back is replaced.',
        )}
      </p>
      <label className={`btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 ${status === 'loading' ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
        <Upload className="w-4 h-4" />
        {status === 'loading' ? t('Import…', 'Importing…') : t('Importer mon fichier', 'Import my file')}
        <input type="file" accept=".txt,text/plain" className="sr-only" onChange={importer} disabled={status === 'loading'} />
      </label>
      {message && (
        <p role={status === 'error' ? 'alert' : 'status'} className={`text-sm mt-3 ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
          {status === 'done' && <Check className="w-4 h-4 inline mr-1" />}{message}
        </p>
      )}
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
