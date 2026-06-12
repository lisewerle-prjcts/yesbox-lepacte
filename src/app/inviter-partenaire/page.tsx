'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { creerCouple, getInviteLink } from '@/app/actions/couple'
import { Copy, Check, Send, ArrowRight } from 'lucide-react'

export default function InviterPartenairePage() {
  const router = useRouter()
  const [step, setStep] = useState<'setup' | 'invite'>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Vérifie si le couple existe déjà
    getInviteLink().then((result) => {
      if (result.success && result.link) {
        setInviteLink(result.link)
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
    setStep('invite')
    setLoading(false)
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  async function shareLink() {
    if (!inviteLink) return
    if (navigator.share) {
      await navigator.share({
        title: 'YES BOX — Le Pacte',
        text: 'Je t\'invite à construire notre pacte de couple ensemble ❤️',
        url: inviteLink,
      })
    } else {
      copyLink()
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
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
              Personnalisez votre espace
            </h1>
            <p className="text-gray-500 mb-6 text-sm">
              Optionnel — tu peux compléter plus tard aussi.
            </p>

            {error && <Alert type="error" message={error} className="mb-5" />}

            <form action={handleSetup} className="space-y-5">
              <div>
                <label htmlFor="nom_couple" className="label">
                  Le nom de votre couple <span className="text-gray-400 font-normal">(optionnel)</span>
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
                  Date d'anniversaire de relation <span className="text-gray-400 font-normal">(optionnel)</span>
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
                {loading ? 'Création...' : 'Continuer'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card animate-slide-up">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-2">
                Ton espace est prêt !
              </h1>
              <p className="text-gray-500 text-sm">
                Partage ce lien à ton/ta partenaire pour qu'il/elle rejoigne ton pacte.
              </p>
            </div>

            <div className="bg-cream-100 rounded-2xl p-4 mb-5">
              <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                Lien d'invitation
              </p>
              <p className="text-sm text-gray-600 break-all font-mono">{inviteLink}</p>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={copyLink}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
              <button
                onClick={shareLink}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                Partager
              </button>
            </div>

            <button
              onClick={() => router.push('/tableau-de-bord')}
              className="w-full text-center text-sm text-gray-400 hover:text-magenta transition-colors"
            >
              Continuer seul·e pour l'instant →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
