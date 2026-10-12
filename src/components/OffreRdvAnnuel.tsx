'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, CalendarHeart } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'
import { passerAuRendezVousAnnuel } from '@/app/actions/abonnement'

const AVANTAGES = [
  'Votre module « Notre rendez-vous annuel » à la date choisie',
  'Accès à tous les modules pour les refaire si vous le souhaitez',
  'Votre journal et votre pacte, toujours à portée de main',
  'Résiliable à tout moment : l’accès reste ouvert jusqu’au dernier jour',
]
const AVANTAGES_EN = [
  'Your "Our Yearly Date" module on the date you chose',
  'Access to every module, to redo them if you wish',
  'Your journal and your pact, always at hand',
  'Cancel anytime: access stays open until the last day',
]

// Offre « Pacte – notre rendez-vous annuel » (39 €/an), proposée une fois le
// pacte signé (page Notre Pacte, page Abonnement).
// mensuelEnCours : un abonnement mensuel Stripe est en cours — la bascule se
// fait alors sans repasser par le paiement, avec la carte déjà enregistrée.
export default function OffreRdvAnnuel({ mensuelEnCours }: { mensuelEnCours: boolean }) {
  const t = useT()
  const router = useRouter()
  const [confirmer, setConfirmer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  async function basculer() {
    setError(null)
    setLoading(true)
    const res = await passerAuRendezVousAnnuel()
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    if (res.url) {
      window.location.href = res.url
      return
    }
    setLoading(false)
    setFait(true)
    router.refresh()
  }

  if (fait) {
    return (
      <div className="card p-6 text-center" style={{ marginTop: 24 }}>
        <CalendarHeart className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--brand)' }} />
        <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('Votre rendez-vous annuel est activé.', 'Your yearly date is active.')}</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{t('Retrouvez sa date de renouvellement dans Mon compte.', 'You can find its renewal date in My Account.')}</p>
      </div>
    )
  }

  return (
    <div id="rdv-annuel-offre" className="card p-6" style={{ marginTop: 24, background: 'var(--brand, #d63e7a)', border: 'none' }}>
      <div className="self-start inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
        {t('Pacte – notre rendez-vous annuel', 'Pact – our yearly date')}
      </div>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,.9)', marginBottom: 12 }}>
        {mensuelEnCours
          ? t('Votre parcours initial est terminé : passez de l’abonnement mensuel à votre rendez-vous annuel.', 'Your initial program is complete: switch from the monthly subscription to your yearly date.')
          : t('Votre parcours initial est terminé : gardez votre rendez-vous annuel à deux.', 'Your initial program is complete: keep your yearly date together.')}
      </p>
      <div className="mb-4">
        <div className="font-fraunces font-bold" style={{ fontSize: 40, color: 'white' }}>39 <small style={{ fontSize: 18 }}>{t('€/an', '€/year')}</small></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{t('accès pendant 1 an · résiliable à tout moment', '1 year of access · cancel anytime')}</div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)', marginBottom: 16 }} />
      <div className="space-y-2 mb-6">
        {AVANTAGES.map((a, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.85)' }} />
            <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.92)' }}>{t(a, AVANTAGES_EN[i])}</span>
          </div>
        ))}
      </div>

      {mensuelEnCours && confirmer && (
        <p className="mb-4" style={{ fontSize: 13, color: 'white', background: 'rgba(0,0,0,.15)', padding: '10px 12px', borderRadius: 8 }}>
          {t(
            'Votre abonnement mensuel sera remplacé dès maintenant. Le temps non utilisé de votre mois en cours est déduit, et le reste des 39 € est prélevé sur la carte déjà enregistrée. Votre accès est alors valable 1 an à partir d’aujourd’hui.',
            'Your monthly subscription will be replaced right away. The unused time of your current month is deducted, and the rest of the €39 is charged to the card on file. Your access is then valid for 1 year from today.'
          )}
        </p>
      )}

      {error && <p className="text-sm mb-4" style={{ color: '#fff', background: 'rgba(0,0,0,.2)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

      <button
        onClick={mensuelEnCours && !confirmer ? () => setConfirmer(true) : basculer}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg"
        style={{ background: 'white', color: 'var(--brand, #d63e7a)', fontSize: 14 }}
      >
        {loading
          ? t('Un instant…', 'One moment…')
          : mensuelEnCours && confirmer
          ? t('Confirmer le passage à 39 €/an', 'Confirm switching to €39/year')
          : <>{t('Activer notre rendez-vous annuel — 39 €/an', 'Activate our yearly date — €39/year')} <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-center mt-3" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
        {t('Paiement sécurisé par Stripe · résiliable à tout moment depuis Mon compte', 'Secure payment via Stripe · cancel anytime from My Account')}
      </p>
    </div>
  )
}
