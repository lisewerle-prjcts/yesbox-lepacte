'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, AlertTriangle } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'
import { demarrerAbonnement, utiliserCode } from '@/app/actions/abonnement'
import CaseRetractation from '@/components/CaseRetractation'
import ChampCode from '@/components/ChampCode'

const FEATURES = [
  'Les 8 modules du pack initial',
  'Accès à vos réponses individuelles et révélations de couple',
  'Votre journal de couple',
  'La signature du pacte de couple',
]
const FEATURES_EN = [
  'The 8 modules of the starter pack',
  'Access to your individual answers and couple reveals',
  "Your couple's journal",
  "Signing your couple's pact",
]

export default function AbonnementClient({ compteResilie }: { compteResilie: boolean }) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renonciation, setRenonciation] = useState(false)

  async function souscrire() {
    setError(null)
    setLoading(true)
    const res = await demarrerAbonnement(renonciation)
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
          {t('Le module 1 est terminé. Prenez le pack initial YES BOX – Le Pacte pour débloquer la suite.', 'Module 1 is complete. Get the YES BOX – Le Pacte starter pack to unlock the rest.')}
        </p>
      </div>

      {compteResilie && (
        <div className="card p-4 mb-6 flex items-start gap-3" style={{ background: '#fdf2f2', border: '1px solid #f5c6c6' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#c0392b' }} />
          <p className="text-sm" style={{ color: '#8a2c2c' }}>
            {t(
              "Ce compte a été clos : l'abonnement ne peut plus être réactivé ici, il faut recommencer avec un nouveau compte.",
              'This account was closed: it can no longer be reactivated here — you need to start over with a new account.'
            )}
          </p>
        </div>
      )}

      <div className="card p-6" style={{ background: 'var(--brand, #d63e7a)' }}>
        <div className="mb-4">
          <div className="font-fraunces font-bold" style={{ fontSize: 40, color: 'white' }}>58 <small style={{ fontSize: 18 }}>€</small></div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{t('Pack initial YES BOX – Le Pacte · paiement unique · 1 an pour réaliser votre parcours', 'YES BOX – Le Pacte starter pack · one-time payment · 1 year to complete your program')}</div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)', marginBottom: 16 }} />
        <div className="space-y-2 mb-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.85)' }} />
              <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.92)' }}>{t(f, FEATURES_EN[i])}</span>
            </div>
          ))}
        </div>
        {error && <p className="text-sm mb-4" style={{ color: '#fff', background: 'rgba(0,0,0,.2)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
        {!compteResilie && <CaseRetractation onChange={setRenonciation} clair />}
        <button
          onClick={souscrire}
          disabled={loading || compteResilie || !renonciation}
          className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg"
          style={{ background: 'white', color: 'var(--brand, #d63e7a)', fontSize: 14, opacity: compteResilie || !renonciation ? 0.5 : 1 }}
        >
          {loading ? t('Redirection…', 'Redirecting…') : <>{t('Prendre le pack initial — 58 €', 'Get the starter pack — €58')} <ArrowRight className="w-4 h-4" /></>}
        </button>
        <p className="text-center mt-3" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
          {t('Paiement unique sécurisé par Stripe, sans abonnement · ensuite, l’abonnement annuel (19 €/an) est facultatif, pour votre rendez-vous annuel · TVA non applicable, art. 293 B du CGI', 'One-time secure payment via Stripe, no subscription · afterwards, the yearly subscription (€19/year) is optional, for your yearly date · VAT not applicable, art. 293 B of the French tax code')}
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
  const [message, setMessage] = useState<string | null>(null)

  async function valider() {
    setError(null)
    setMessage(null)
    setLoading(true)
    const res = await utiliserCode(code)
    if ('error' in res) {
      setError(res.error)
      setLoading(false)
      return
    }
    setMessage(res.message)
    setTimeout(() => router.push('/tableau-de-bord'), 2000)
  }

  return (
    <div className="card p-5 mt-5 text-center">
      <p className="text-sm text-gray-600 mb-3">{t('Tu as un code (carte cadeau, parrainage, code gratuit) ?', 'Do you have a code (gift card, referral, free code)?')}</p>
      <div className="flex items-center gap-2 justify-center max-w-xs mx-auto">
        <ChampCode
          placeholder={t('Ton code', 'Your code')}
          value={code}
          onChange={setCode}
          onEntree={() => { if (code.trim() && !loading) valider() }}
        />
        <button onClick={valider} disabled={loading || !code.trim()} className="btn-secondary text-sm py-2 px-4 shrink-0">
          {loading ? '…' : t('Valider', 'Apply')}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {message && <p className="text-sm text-green-700 mt-2">{message}</p>}
    </div>
  )
}
