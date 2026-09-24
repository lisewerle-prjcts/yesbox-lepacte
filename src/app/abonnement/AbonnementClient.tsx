'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, AlertTriangle } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'
import { demarrerAbonnement, utiliserCodeGratuit } from '@/app/actions/abonnement'

const FEATURES = [
  "L'ensemble des modules du parcours initial (hors Bilans annuels de Couple)",
  'Sessions de révélation à deux',
  'Journal de couple',
  'Votre CDD de couple personnalisé',
]
const FEATURES_EN = [
  'The full initial program (excluding Annual Couple Check-ins)',
  'Joint reveal sessions',
  "Your couple's journal",
  "Your couple's personalized CDD",
]

export default function AbonnementClient({ compteResilie }: { compteResilie: boolean }) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function souscrire() {
    setError(null)
    setLoading(true)
    const res = await demarrerAbonnement()
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    if (res.url) window.location.href = res.url
  }

  return (
    <div className="fade">
      <div className="mb-8 text-center">
        <div className="eyebrow justify-center mb-3">{t('Étape suivante', 'Next step')}</div>
        <h1 className="font-fraunces text-3xl font-bold text-gray-900 mb-2">
          {t('Continuez l’aventure ensemble', 'Continue the journey together')}
        </h1>
        <p className="text-gray-500 text-sm">
          {t('Le module 1 est terminé. Passez à l’abonnement mensuel pour débloquer la suite.', 'Module 1 is complete. Subscribe monthly to unlock the rest.')}
        </p>
      </div>

      {compteResilie && (
        <div className="card p-4 mb-6 flex items-start gap-3" style={{ background: '#fdf2f2', border: '1px solid #f5c6c6' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#c0392b' }} />
          <p className="text-sm" style={{ color: '#8a2c2c' }}>
            {t(
              "Ce compte a été résilié après 18 mois sans abonnement actif : l'abonnement ne peut plus être réactivé ici, il faut recommencer avec un nouveau compte.",
              'This account was closed after 18 months without an active subscription: it can no longer be reactivated here — you need to start over with a new account.'
            )}
          </p>
        </div>
      )}

      <div className="card p-6" style={{ background: 'var(--brand, #d63e7a)' }}>
        <div className="mb-4">
          <div className="font-fraunces font-bold" style={{ fontSize: 40, color: 'white' }}>29 <small style={{ fontSize: 18 }}>{t('€/mois', '€/month')}</small></div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{t('abonnement · résiliable à tout moment', 'subscription · cancel anytime')}</div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)', marginBottom: 16 }} />
        <div className="space-y-2 mb-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.85)' }} />
              <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.92)' }}>{t(f, FEATURES_EN[i])}</span>
            </div>
          ))}
        </div>
        {error && <p className="text-sm mb-4" style={{ color: '#fff', background: 'rgba(0,0,0,.2)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
        <button
          onClick={souscrire}
          disabled={loading || compteResilie}
          className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg"
          style={{ background: 'white', color: 'var(--brand, #d63e7a)', fontSize: 14, opacity: compteResilie ? 0.5 : 1 }}
        >
          {loading ? t('Redirection…', 'Redirecting…') : <>{t('S’abonner — 29€/mois', 'Subscribe — €29/month')} <ArrowRight className="w-4 h-4" /></>}
        </button>
        <p className="text-center mt-3" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
          {t('Paiement sécurisé par Stripe · résiliable à tout moment depuis Mon compte', 'Secure payment via Stripe · cancel anytime from My Account')}
        </p>
      </div>

      {!compteResilie && <CodeGratuitForm />}
    </div>
  )
}

function CodeGratuitForm() {
  const t = useT()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function valider() {
    setError(null)
    setLoading(true)
    const res = await utiliserCodeGratuit(code)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    router.push('/tableau-de-bord')
  }

  return (
    <div className="card p-5 mt-5 text-center">
      <p className="text-sm text-gray-600 mb-3">{t('Tu as un code de réduction ?', 'Do you have a discount code?')}</p>
      <div className="flex items-center gap-2 justify-center max-w-xs mx-auto">
        <input
          type="text"
          className="input-field uppercase"
          placeholder={t('Ton code', 'Your code')}
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        <button onClick={valider} disabled={loading || !code.trim()} className="btn-secondary text-sm py-2 px-4 flex-shrink-0">
          {loading ? '…' : t('Valider', 'Apply')}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
