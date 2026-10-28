'use client'

import { useState } from 'react'
import { Copy, Check, Send, KeyRound, Heart, Mail, CalendarHeart } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import { updatePrenomPartenaire, updateDateAnniversaire, updateDateMariage } from '@/app/actions/compte'
import { rejoindrePartenaireParCode, envoyerInvitationPartenaire } from '@/app/actions/couple'
import { getProchainAnniversaire } from '@/lib/anniversaires'
import { useT, useLocale } from '@/components/i18n/LocaleContext'
import type { Locale } from '@/lib/i18n/locale'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function VotreCoupleCard({
  hasPartner,
  partnerPrenom: initialPartnerPrenom,
  dateAnniversaire,
  dateMariage,
  pairingCode,
  inviteLink,
  initialCodeError,
}: {
  hasPartner: boolean
  partnerPrenom: string
  dateAnniversaire: string
  dateMariage: string
  pairingCode: string | null
  inviteLink: string | null
  initialCodeError?: string | null
}) {
  const [partnerPrenom, setPartnerPrenom] = useState(initialPartnerPrenom)
  const [partnerStatus, setPartnerStatus] = useState<SaveStatus>('idle')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(initialCodeError ?? null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const { locale } = useLocale()
  // Langue de l'e-mail d'invitation : celle du site par défaut, modifiable
  // quand le ou la partenaire parle une autre langue.
  const [langueInvitation, setLangueInvitation] = useState<Locale>(locale)
  const t = useT()

  async function savePartnerPrenom() {
    setPartnerStatus('saving')
    const res = await updatePrenomPartenaire(partnerPrenom)
    setPartnerStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setPartnerStatus('idle'), 2500)
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

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteStatus('sending')
    const res = await envoyerInvitationPartenaire(inviteEmail, langueInvitation)
    if (res.error) {
      setInviteError(res.error)
      setInviteStatus('idle')
      return
    }
    setInviteStatus('sent')
  }

  async function handleJoin(formData: FormData) {
    setJoinLoading(true)
    setJoinError(null)
    const res = await rejoindrePartenaireParCode(formData)
    setJoinLoading(false)
    if (res.error) setJoinError(res.error)
  }

  return (
    <div className="card p-5 mb-6">
      <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>{t('Votre couple', 'Your couple')}</h2>

      {joinError && <Alert type="error" message={joinError} className="mb-4" />}

      {hasPartner && (
        <div className="mb-4" style={{ maxWidth: 360 }}>
          <label className="flabel">{t('Prénom de ton/ta partenaire', "Your partner's first name")}</label>
          <div className="flex gap-2">
            <input type="text" className="field" value={partnerPrenom} onChange={e => setPartnerPrenom(e.target.value)} />
            <button onClick={savePartnerPrenom} disabled={partnerStatus === 'saving'} className="btn-secondary text-sm px-3" style={{ flexShrink: 0 }}>
              {partnerStatus === 'saved' ? <Check className="w-4 h-4" /> : 'OK'}
            </button>
          </div>
        </div>
      )}

      <div className="surface p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <CalendarHeart className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <p className="font-semibold" style={{ fontSize: 14, color: 'var(--ink)' }}>{t('Nos grandes dates', 'Our big dates')}</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{t('Quelles sont vos dates de couple ?', 'What are your couple dates?')}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <DateCouple
            label={t('Anniversaire de couple', 'Couple anniversary')}
            hint={t('Le jour où tout a commencé', 'The day it all began')}
            initial={dateAnniversaire}
            save={updateDateAnniversaire}
          />
          <DateCouple
            label={t('Date de mariage', 'Wedding date')}
            initial={dateMariage}
            save={updateDateMariage}
          />
        </div>
      </div>

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

          <div className="surface p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
              <p className="font-semibold" style={{ fontSize: 13, color: 'var(--ink)' }}>{t('Inviter ton/ta partenaire par e-mail', 'Invite your partner by email')}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{t('Nous lui envoyons le lien pour rejoindre votre espace, avec votre code de couple.', 'We send them the link to join your space, along with your couple code.')}</p>
            {inviteStatus === 'sent' ? (
              <p className="flex items-center gap-1.5" style={{ fontSize: 13, color: 'var(--sage)' }}>
                <Check className="w-4 h-4" /> {t(`Invitation envoyée à ${inviteEmail}`, `Invitation sent to ${inviteEmail}`)}
              </p>
            ) : (
              <form onSubmit={sendInvite} className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder={t('Son adresse e-mail', 'Their email address')}
                  required
                  className="field"
                  style={{ flex: 1 }}
                />
                <select
                  value={langueInvitation}
                  onChange={e => setLangueInvitation(e.target.value as Locale)}
                  className="field"
                  style={{ flex: '0 0 4.5rem', paddingLeft: 8, paddingRight: 4 }}
                  aria-label={t('Langue de l’e-mail', 'Email language')}
                  title={t('Langue de l’e-mail', 'Email language')}
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
                <button type="submit" disabled={inviteStatus === 'sending'} className="btn-brand text-sm px-4" style={{ flexShrink: 0 }}>
                  {inviteStatus === 'sending' ? '…' : t('Envoyer', 'Send')}
                </button>
              </form>
            )}
            {inviteError && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{inviteError}</p>}
          </div>

          <div className="surface p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
              <p className="font-semibold" style={{ fontSize: 13, color: 'var(--ink)' }}>{t('Ton/ta partenaire a déjà un code ?', 'Your partner already has a code?')}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{t("Si ton ou ta partenaire a créé son profil de son côté sans indiquer ton code, renseigne le sien ici pour vous pairer.", 'If they created their profile separately without entering your code, enter theirs here to pair up.')}</p>
            <form action={handleJoin} className="flex gap-2">
              <input
                name="code"
                type="text"
                placeholder={t('Ex : A3F9K', 'E.g.: A3F9K')}
                maxLength={12}
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

// Une date du bloc « Nos grandes dates » : champ + enregistrement, et rappel
// du prochain anniversaire de cette date une fois renseignée.
function DateCouple({
  label,
  hint,
  initial,
  save,
}: {
  label: string
  hint?: string
  initial: string
  save: (date: string) => Promise<{ error?: string; success?: boolean }>
}) {
  const [date, setDate] = useState(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const t = useT()

  async function enregistrer() {
    setStatus('saving')
    const res = await save(date)
    setStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const prochain = date ? getProchainAnniversaire(date) : null

  return (
    <div>
      <label className="flabel">{label}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -2, marginBottom: 6 }}>{hint}</p>}
      <div className="flex gap-2">
        <ChoixDate value={date} onChange={setDate} />
        <button onClick={enregistrer} disabled={status === 'saving' || (!!date && !/^\d{4}-\d{2}-\d{2}$/.test(date))} className="btn-secondary text-sm px-3" style={{ flexShrink: 0 }}>
          {status === 'saved' ? <Check className="w-4 h-4" /> : 'OK'}
        </button>
      </div>
      {status === 'error' && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{t("L'enregistrement a échoué, réessaie.", 'Saving failed, please try again.')}</p>}
      {prochain && prochain.years > 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6 }}>
          {t('Prochain anniversaire : ', 'Next anniversary: ')}
          {t(
            `le ${prochain.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — `,
            `${prochain.date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} — `
          )}
          <strong>{prochain.years}</strong>{t(` an${prochain.years > 1 ? 's' : ''}`, ` year${prochain.years > 1 ? 's' : ''}`)}
        </p>
      )}
    </div>
  )
}

// Jour, mois et année en trois listes : le calendrier du navigateur obligeait
// à remonter mois par mois jusqu'à l'année de la rencontre. Tant qu'une des
// trois manque, la valeur reste incomplète (« 2015-03- ») et OK est grisé.
function ChoixDate({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const t = useT()
  const [a = '', m = '', j = ''] = value ? value.split('-') : []
  const [annee, setAnnee] = useState(a)
  const [mois, setMois] = useState(m)
  const [jour, setJour] = useState(j)

  const anneeCourante = new Date().getFullYear()
  // Quelques années à venir : un mariage peut être prévu.
  const annees = Array.from({ length: 83 }, (_, i) => String(anneeCourante + 3 - i))
  const nomsMois = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(t('fr-FR', 'en-US'), { month: 'long' }))
  const joursDansMois = annee && mois ? new Date(Number(annee), Number(mois), 0).getDate() : 31

  function changer(nouveau: { annee?: string; mois?: string; jour?: string }) {
    const an = nouveau.annee ?? annee
    const mo = nouveau.mois ?? mois
    let jo = nouveau.jour ?? jour
    // 31 → 30 (ou 28/29) si le mois choisi est plus court.
    const max = an && mo ? new Date(Number(an), Number(mo), 0).getDate() : 31
    if (jo && Number(jo) > max) jo = String(max).padStart(2, '0')
    setAnnee(an)
    setMois(mo)
    setJour(jo)
    onChange(an || mo || jo ? `${an}-${mo}-${jo}` : '')
  }

  const style = { flex: 1, minWidth: 0, paddingLeft: 8, paddingRight: 4 }
  return (
    <div className="flex gap-1.5" style={{ flex: 1, minWidth: 0 }}>
      <select className="field" style={{ ...style, flex: '0 0 4.2rem' }} value={jour} onChange={e => changer({ jour: e.target.value })} aria-label={t('Jour', 'Day')}>
        <option value="">{t('Jour', 'Day')}</option>
        {Array.from({ length: joursDansMois }, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d}>{Number(d)}</option>)}
      </select>
      <select className="field" style={style} value={mois} onChange={e => changer({ mois: e.target.value })} aria-label={t('Mois', 'Month')}>
        <option value="">{t('Mois', 'Month')}</option>
        {nomsMois.map((nom, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{nom}</option>)}
      </select>
      <select className="field" style={{ ...style, flex: '0 0 5rem' }} value={annee} onChange={e => changer({ annee: e.target.value })} aria-label={t('Année', 'Year')}>
        <option value="">{t('Année', 'Year')}</option>
        {annees.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}
