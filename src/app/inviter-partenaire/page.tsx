'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import EditableText from '@/components/edit-mode/EditableText'
import { creerCouple, getInviteLink, rejoindrePartenaireParCode } from '@/app/actions/couple'
import { getProchainAnniversaire } from '@/lib/anniversaires'
import { Copy, Check, Send, ArrowRight, KeyRound, ArrowLeft, Gift } from 'lucide-react'

function InviterPartenaireContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'setup' | 'invite'>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(searchParams.get('code_error'))
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [dateAnniversaire, setDateAnniversaire] = useState<string | null>(null)
  const [paired, setPaired] = useState(false)
  const [copied, setCopied] = useState(false)

  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifie si le couple existe déjà
    getInviteLink().then((result) => {
      if (result.success && result.link) {
        setInviteLink(result.link)
        setPairingCode(result.pairingCode || null)
        setDateAnniversaire(result.dateAnniversaire || null)
        setPaired(!!result.paired)
        setStep('invite')
      }
    })
  }, [])

  async function handleSetup(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await creerCouple(formData)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    setInviteLink(`${baseUrl}/rejoindre?token=${result.couple?.invite_token}`)
    setPairingCode(result.couple?.pairing_code || null)
    setDateAnniversaire(result.couple?.date_anniversaire || null)
    setStep('invite')
    setLoading(false)
  }

  const prochainAnniversaire = dateAnniversaire ? getProchainAnniversaire(dateAnniversaire) : null

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  async function copyCode() {
    if (!pairingCode) return
    await navigator.clipboard.writeText(pairingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  async function shareLink() {
    if (!inviteLink) return
    if (navigator.share) {
      await navigator.share({
        title: 'YES BOX — Le Pacte',
        text: `Je t'invite à construire notre pacte de couple ensemble ❤️ Notre code : ${pairingCode || ''}`,
        url: inviteLink,
      })
    } else {
      copyLink()
    }
  }

  async function handleJoin(formData: FormData) {
    setJoinLoading(true)
    setJoinError(null)
    const result = await rejoindrePartenaireParCode(formData)
    if (result.error) {
      setJoinError(result.error)
      setJoinLoading(false)
      return
    }
    router.push('/tableau-de-bord')
  }

  return (
    <div className="w-full max-w-md">
      <Link
        href="/tableau-de-bord"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-magenta transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> <EditableText id="inviter.retour">Retour au tableau de bord</EditableText>
      </Link>

      <div className="text-center mb-8">
        <Logo size="md" className="inline-block mb-4" />
        <div className="flex items-center justify-center gap-3 mb-4">
          {['Compte', 'Espace couple', 'Invitation'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < 2 ? 'bg-magenta text-white' : step === 'invite' ? 'bg-magenta text-white' : 'bg-cream-300 text-gray-400'}`}
              >
                {i < 2 ? '✓' : i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-magenta" />}
            </div>
          ))}
        </div>
      </div>

      {step === 'setup' ? (
        <div className="card animate-slide-up">
          <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">
            <EditableText id="inviter.setup.titre">Personnalisez votre espace</EditableText>
          </h1>
          <p className="text-gray-500 mb-6 text-sm">
            <EditableText id="inviter.setup.souscritre">Optionnel — tu peux compléter plus tard aussi.</EditableText>
          </p>

          {error && <Alert type="error" message={error} className="mb-5" />}

          <form action={handleSetup} className="space-y-5">
            <div>
              <label htmlFor="nom_couple" className="label">
                <EditableText id="inviter.field.nomcouple">Le nom de votre couple</EditableText> <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                id="nom_couple"
                name="nom_couple"
                type="text"
                placeholder="Ex : Marie & Pierre"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="date_anniversaire" className="label">
                <EditableText id="inviter.field.date">Date d&apos;anniversaire de relation</EditableText> <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                id="date_anniversaire"
                name="date_anniversaire"
                type="date"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size="sm" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Création...' : <EditableText id="inviter.setup.cta">Continuer</EditableText>}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card animate-slide-up">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">
                <EditableText id="inviter.pret.titre">Ton espace est prêt !</EditableText>
              </h1>
              <p className="text-gray-500 text-sm">
                {paired
                  ? <EditableText id="inviter.pret.paire" multiline>Vous êtes pairé·es ! Vous pouvez commencer le module 1.</EditableText>
                  : <EditableText id="inviter.pret.nonpaire" multiline>Partage ce code ou ce lien à ton/ta partenaire pour qu&apos;il/elle rejoigne ton pacte.</EditableText>}
              </p>
            </div>

            {!paired && pairingCode && (
              <div className="bg-magenta-50 rounded-2xl p-4 mb-4 text-center">
                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                  <EditableText id="inviter.codepairage.label">Code de pairage</EditableText>
                </p>
                <p className="text-3xl font-mono font-bold tracking-[0.3em] text-magenta mb-3">{pairingCode}</p>
                <button
                  onClick={copyCode}
                  className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : <EditableText id="inviter.copiercode">Copier le code</EditableText>}
                </button>
              </div>
            )}

            {!paired && (
              <>
                <div className="bg-cream-100 rounded-2xl p-4 mb-5">
                  <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                    <EditableText id="inviter.lien.label">Ou le lien d&apos;invitation</EditableText>
                  </p>
                  <p className="text-sm text-gray-600 break-all font-mono">{inviteLink}</p>
                </div>

                <div className="flex gap-3 mb-2">
                  <button
                    onClick={copyLink}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copié !' : <EditableText id="inviter.copierlien">Copier le lien</EditableText>}
                  </button>
                  <button
                    onClick={shareLink}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    <EditableText id="inviter.partager">Partager</EditableText>
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => router.push('/tableau-de-bord')}
              className="w-full text-center text-sm text-gray-400 hover:text-magenta transition-colors mt-4"
            >
              {paired
                ? <EditableText id="inviter.aller.paire">Aller au tableau de bord →</EditableText>
                : <EditableText id="inviter.aller.solo">Continuer seul·e pour l&apos;instant →</EditableText>}
            </button>
          </div>

          {prochainAnniversaire && (
            <div className="card animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-magenta" />
                <h2 className="font-fraunces text-lg font-bold text-gray-900">
                  <EditableText id="inviter.anniversaire.titre">Votre prochain anniversaire</EditableText>
                </h2>
              </div>
              <p className="text-gray-700 text-sm mb-2">
                Le{' '}
                <strong>
                  {prochainAnniversaire.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
                {' '}— vos <strong>{prochainAnniversaire.years}</strong> an{prochainAnniversaire.years > 1 ? 's' : ''}, les{' '}
                <span className="text-magenta font-semibold">noces de {prochainAnniversaire.matiere}</span>.
              </p>
              <p className="text-gray-500 text-sm">
                <EditableText id="inviter.anniversaire.rituel.prefix">Une idée de rituel : offrez-vous, ce jour-là, un petit geste symbolique autour du</EditableText> {prochainAnniversaire.matiere} <EditableText id="inviter.anniversaire.rituel.suffix">— un cadeau modeste, à la mesure de l&apos;année écoulée.</EditableText>
              </p>
            </div>
          )}

          {!paired && (
            <div className="card animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-magenta" />
                <h2 className="font-fraunces text-lg font-bold text-gray-900">
                  <EditableText id="inviter.dejacode.titre">Ton/ta partenaire a déjà un code ?</EditableText>
                </h2>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                <EditableText id="inviter.dejacode.texte" multiline>S&apos;il/elle a créé son profil de son côté sans indiquer ton code, renseigne le sien ici pour vous pairer.</EditableText>
              </p>
              {joinError && <Alert type="error" message={joinError} className="mb-4" />}
              <form action={handleJoin} className="flex gap-2">
                <input
                  name="code"
                  type="text"
                  placeholder="Ex : A3F9K2"
                  maxLength={6}
                  autoCapitalize="characters"
                  required
                  className="input-field uppercase flex-1"
                />
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="btn-primary px-5 flex items-center justify-center"
                >
                  {joinLoading ? <Spinner size="sm" /> : <EditableText id="inviter.pairer">Pairer</EditableText>}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function InviterPartenairePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <Suspense fallback={<Spinner className="mx-auto" />}>
        <InviterPartenaireContent />
      </Suspense>
    </div>
  )
}
