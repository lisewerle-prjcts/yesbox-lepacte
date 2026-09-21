'use client'

import { useState } from 'react'
import { Copy, Check, Send, KeyRound, Gift, Heart } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import { updatePrenomPartenaire, updateDateAnniversaire } from '@/app/actions/compte'
import { rejoindrePartenaireParCode } from '@/app/actions/couple'
import { getAnniversaireActuel, getProchainAnniversaire } from '@/lib/anniversaires'
import { useT } from '@/components/i18n/LocaleContext'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function VotreCoupleCard({
  hasPartner,
  partnerPrenom: initialPartnerPrenom,
  dateAnniversaire: initialDate,
  pairingCode,
  inviteLink,
  initialCodeError,
}: {
  hasPartner: boolean
  partnerPrenom: string
  dateAnniversaire: string
  pairingCode: string | null
  inviteLink: string | null
  initialCodeError?: string | null
}) {
  const [partnerPrenom, setPartnerPrenom] = useState(initialPartnerPrenom)
  const [partnerStatus, setPartnerStatus] = useState<SaveStatus>('idle')
  const [date, setDate] = useState(initialDate)
  const [dateStatus, setDateStatus] = useState<SaveStatus>('idle')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(initialCodeError ?? null)
  const t = useT()

  async function savePartnerPrenom() {
    setPartnerStatus('saving')
    const res = await updatePrenomPartenaire(partnerPrenom)
    setPartnerStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setPartnerStatus('idle'), 2500)
  }

  async function saveDate() {
    setDateStatus('saving')
    const res = await updateDateAnniversaire(date)
    setDateStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setDateStatus('idle'), 2500)
  }

  async function copy(text: string, which: 'code' | 'link') {
    await navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 3000)
  }

  async function share() {
    if (!inviteLink) return
    if (navigator.share) {
      await navigator.share({
        title: 'YES BOX — Le Pacte',
        text: t(
          `Je t'invite à construire notre pacte de couple ensemble ❤️ Notre code : ${pairingCode || ''}`,
          `I'm inviting you to build our couple's pact together ❤️ Our code: ${pairingCode || ''}`
        ),
        url: inviteLink,
      })
    } else {
      copy(inviteLink, 'link')
    }
  }

  async function handleJoin(formData: FormData) {
    setJoinLoading(true)
    setJoinError(null)
    const res = await rejoindrePartenaireParCode(formData)
    setJoinLoading(false)
    if (res.error) setJoinError(res.error)
  }

  const anniversaireActuel = date ? getAnniversaireActuel(date) : null
  const prochainAnniversaire = date ? getProchainAnniversaire(date) : null

  return (
    <div className="card p-5 mb-6">
      <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>{t('Votre couple', 'Your couple')}</h2>

      {joinError && <Alert type="error" message={joinError} className="mb-4" />}

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {hasPartner && (
          <div>
            <label className="flabel">{t('Prénom de ton/ta partenaire', "Your partner's first name")}</label>
            <div className="flex gap-2">
              <input type="text" className="field" value={partnerPrenom} onChange={e => setPartnerPrenom(e.target.value)} />
              <button onClick={savePartnerPrenom} disabled={partnerStatus === 'saving'} className="btn-secondary text-sm px-3" style={{ flexShrink: 0 }}>
                {partnerStatus === 'saved' ? <Check className="w-4 h-4" /> : 'OK'}
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="flabel">{t("Date d'anniversaire de couple", 'Couple anniversary date')}</label>
          <div className="flex gap-2">
            <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} />
            <button onClick={saveDate} disabled={dateStatus === 'saving'} className="btn-secondary text-sm px-3" style={{ flexShrink: 0 }}>
              {dateStatus === 'saved' ? <Check className="w-4 h-4" /> : 'OK'}
            </button>
          </div>
        </div>
      </div>

      {(anniversaireActuel || prochainAnniversaire) && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {anniversaireActuel && (
            <div className="surface p-3">
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                <Gift className="w-3 h-3 inline mr-1" />{t('En cours', 'Current')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                <strong>{anniversaireActuel.years}</strong>{t(
                  ` an${anniversaireActuel.years > 1 ? 's' : ''} — noces de `,
                  `-year${anniversaireActuel.years > 1 ? 's' : ''} anniversary — `
                )}<strong>{anniversaireActuel.matiere}</strong>
              </p>
            </div>
          )}
          {prochainAnniversaire && (
            <div className="surface p-3">
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                {t('À venir', 'Coming up')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                {t(
                  `Le ${prochainAnniversaire.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — noces de `,
                  `On ${prochainAnniversaire.date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} — `
                )}<strong>{prochainAnniversaire.matiere}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {!hasPartner && pairingCode && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 4 }}>
          <div className="surface p-4 text-center mb-3">
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{t('Code de pairage', 'Pairing code')}</p>
            <p className="font-mono font-bold" style={{ fontSize: 28, letterSpacing: '.3em', color: 'var(--brand)', marginBottom: 12 }}>{pairingCode}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button onClick={() => copy(pairingCode, 'code')} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'code' ? t('Copié !', 'Copied!') : t('Copier le code', 'Copy the code')}
              </button>
              {inviteLink && (
                <button onClick={share} className="btn-brand text-sm py-2 px-4 flex items-center gap-2">
                  <Send className="w-4 h-4" /> {t('Partager', 'Share')}
                </button>
              )}
            </div>
          </div>

          <div className="surface p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
              <p className="font-semibold" style={{ fontSize: 13, color: 'var(--ink)' }}>{t('Ton/ta partenaire a déjà un code ?', 'Your partner already has a code?')}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{t("S'il/elle a créé son profil de son côté sans indiquer ton code, renseigne le sien ici pour vous pairer.", 'If they created their profile separately without entering your code, enter theirs here to pair up.')}</p>
            <form action={handleJoin} className="flex gap-2">
              <input
                name="code"
                type="text"
                placeholder={t('Ex : A3F9K', 'E.g.: A3F9K')}
                maxLength={5}
                autoCapitalize="characters"
                required
                className="field uppercase"
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={joinLoading} className="btn-brand text-sm px-4" style={{ flexShrink: 0 }}>
                {joinLoading ? '…' : t('Pairer', 'Pair up')}
              </button>
            </form>
          </div>
        </div>
      )}

      {hasPartner && (
        <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--sage)' }}>
          <Heart className="w-3.5 h-3.5" /> {t('Vous êtes pairé·es', "You're paired up")}
        </p>
      )}
    </div>
  )
}
