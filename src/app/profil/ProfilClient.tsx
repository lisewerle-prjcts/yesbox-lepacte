'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateIdentite, updateCouple } from '@/app/actions/profil'
import { rejoindrePartenaireParCode } from '@/app/actions/couple'
import { getProchainAnniversaire } from '@/lib/anniversaires'
import { User, Heart, KeyRound, Copy, Check } from 'lucide-react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  profile: { prenom: string | null; nom: string | null; email: string } | null
  couple: { pairing_code: string | null; date_anniversaire: string | null; nom_couple: string | null } | null
  partner: { prenom: string | null; email: string } | null
}

export default function ProfilClient({ profile, couple, partner }: Props) {
  const router = useRouter()

  const [identiteStatus, setIdentiteStatus] = useState<SaveStatus>('idle')
  const [identiteError, setIdentiteError] = useState<string | null>(null)

  const [dateAnniversaire, setDateAnniversaire] = useState(couple?.date_anniversaire || '')
  const [dateStatus, setDateStatus] = useState<SaveStatus>('idle')

  const [copied, setCopied] = useState(false)

  const [joinStatus, setJoinStatus] = useState<'idle' | 'joining' | 'error'>('idle')
  const [joinError, setJoinError] = useState<string | null>(null)

  async function saveIdentite(formData: FormData) {
    setIdentiteStatus('saving')
    setIdentiteError(null)
    const result = await updateIdentite(formData)
    if (result.error) {
      setIdentiteError(result.error)
      setIdentiteStatus('error')
      return
    }
    setIdentiteStatus('saved')
    router.refresh()
    setTimeout(() => setIdentiteStatus('idle'), 2000)
  }

  async function saveCouple(formData: FormData) {
    setDateStatus('saving')
    const result = await updateCouple(formData)
    setDateStatus(result.error ? 'error' : 'saved')
    router.refresh()
    setTimeout(() => setDateStatus('idle'), 2000)
  }

  async function copyCode() {
    if (!couple?.pairing_code) return
    await navigator.clipboard.writeText(couple.pairing_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleJoin(formData: FormData) {
    setJoinStatus('joining')
    setJoinError(null)
    const result = await rejoindrePartenaireParCode(formData)
    if (result.error) {
      setJoinError(result.error)
      setJoinStatus('error')
      return
    }
    setJoinStatus('idle')
    router.refresh()
  }

  const prochainAnniversaire = dateAnniversaire ? getProchainAnniversaire(dateAnniversaire) : null

  return (
    <div className="space-y-6">
      {/* Identité */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
            Mes informations
          </h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{profile?.email}</p>

        <form action={saveIdentite} className="space-y-3">
          <div>
            <label className="flabel">Prénom</label>
            <input name="prenom" defaultValue={profile?.prenom || ''} className="field" required minLength={2} />
          </div>
          <div>
            <label className="flabel">
              Nom <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>(optionnel)</span>
            </label>
            <input name="nom" defaultValue={profile?.nom || ''} className="field" />
          </div>
          {identiteError && <p style={{ fontSize: 12, color: '#dc2626' }}>{identiteError}</p>}
          <button type="submit" disabled={identiteStatus === 'saving'} className="btn-brand text-sm flex items-center gap-2">
            {identiteStatus === 'saving' && 'Enregistrement…'}
            {identiteStatus === 'saved' && <><Check className="w-4 h-4" /> Enregistré</>}
            {(identiteStatus === 'idle' || identiteStatus === 'error') && 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Code de pairage */}
      {couple && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              Mon code de pairage
            </h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Partage ce code à ton/ta partenaire pour qu&apos;il/elle te rejoigne.
          </p>
          <div className="surface p-4 flex items-center justify-between gap-3 flex-wrap">
            <span className="font-mono font-bold" style={{ fontSize: 24, letterSpacing: '.25em', color: 'var(--brand)' }}>
              {couple.pairing_code}
            </span>
            <button onClick={copyCode} className="btn-ghost text-sm py-2 flex items-center gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {/* Binôme */}
      {couple && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              Mon binôme
            </h2>
          </div>
          {partner ? (
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              Tu es pairé·e avec <strong>{partner.prenom || partner.email}</strong>.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                Pas encore de binôme ? Renseigne son code pour vous pairer.
              </p>
              <form action={handleJoin} className="flex gap-2">
                <input
                  name="code"
                  placeholder="Ex : A3F9K2"
                  maxLength={6}
                  autoCapitalize="characters"
                  required
                  className="field uppercase flex-1"
                />
                <button type="submit" disabled={joinStatus === 'joining'} className="btn-brand text-sm">
                  {joinStatus === 'joining' ? 'Pairage…' : 'Pairer'}
                </button>
              </form>
              {joinError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{joinError}</p>}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                Ton/ta partenaire n&apos;a pas encore de code ?{' '}
                <Link href="/inviter-partenaire" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                  Invite-le/la
                </Link>
              </p>
            </>
          )}
        </div>
      )}

      {/* Notre couple */}
      {couple && (
        <div className="card p-5">
          <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            Notre couple
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Le nom de votre couple et la date où votre histoire a commencé.
          </p>
          <form action={saveCouple} className="space-y-3">
            <div>
              <label className="flabel">
                Nom du couple <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input
                type="text"
                name="nom_couple"
                defaultValue={couple.nom_couple || ''}
                placeholder="Ex : Marie & Pierre"
                className="field"
              />
            </div>
            <div>
              <label className="flabel">
                Date d&apos;anniversaire <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input
                type="date"
                name="date_anniversaire"
                className="field"
                value={dateAnniversaire || ''}
                onChange={e => setDateAnniversaire(e.target.value)}
              />
            </div>
            <button type="submit" disabled={dateStatus === 'saving'} className="btn-brand text-sm flex items-center gap-2">
              {dateStatus === 'saving' && 'Enregistrement…'}
              {dateStatus === 'saved' && <><Check className="w-4 h-4" /> Enregistré</>}
              {(dateStatus === 'idle' || dateStatus === 'error') && 'Enregistrer'}
            </button>
          </form>
          {prochainAnniversaire && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
              Prochain anniversaire : le{' '}
              <strong style={{ color: 'var(--ink)' }}>
                {prochainAnniversaire.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </strong>{' '}
              — vos {prochainAnniversaire.years} an{prochainAnniversaire.years > 1 ? 's' : ''}, les noces de{' '}
              {prochainAnniversaire.matiere}.
            </p>
          )}
        </div>
      )}

      {!couple && (
        <div className="card p-5">
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Tu n&apos;as pas encore d&apos;espace couple.{' '}
            <Link href="/inviter-partenaire" style={{ color: 'var(--brand)', fontWeight: 600 }}>
              Crée-le maintenant
            </Link>.
          </p>
        </div>
      )}
    </div>
  )
}
