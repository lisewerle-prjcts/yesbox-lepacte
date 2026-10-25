'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, CalendarHeart } from 'lucide-react'
import { useT, useLocale } from '@/components/i18n/LocaleContext'
import { passerAuRendezVousAnnuel } from '@/app/actions/abonnement'
import CaseRetractation from '@/components/CaseRetractation'

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

// Offre « Pacte – notre rendez-vous annuel » (19 €/an), proposée une fois le
// pacte signé ou la première année de YES BOX terminée (page Notre Pacte,
// page Abonnement).
// mensuelEnCours : un abonnement mensuel Stripe est en cours — le couple
// valide alors la bascule, qui a lieu à la fin du mois déjà payé (finPeriode) :
// les 19 € sont prélevés ce jour-là sur la carte déjà enregistrée.

function formaterDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function OffreRdvAnnuel({ mensuelEnCours, finPeriode }: { mensuelEnCours: boolean; finPeriode: string | null }) {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const [confirmer, setConfirmer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [basculeLe, setBasculeLe] = useState<string | null>(null)
  const [renonciation, setRenonciation] = useState(false)

  async function basculer() {
    setError(null)
    setLoading(true)
    const res = await passerAuRendezVousAnnuel(renonciation)
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
    setBasculeLe(res.basculeLe ?? finPeriode ?? '')
    router.refresh()
  }

  if (basculeLe !== null) {
    return (
      <div className="card p-6 text-center" style={{ marginTop: 24 }}>
        <CalendarHeart className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--brand)' }} />
        <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('C’est noté !', 'All set!')}</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {basculeLe
            ? t(`Le ${formaterDate(basculeLe, locale)}, votre abonnement passe à « Pacte – notre rendez-vous annuel » (19 €/an). D’ici là, rien ne change. Vous pouvez revenir sur ce choix depuis Mon compte.`, `On ${formaterDate(basculeLe, locale)}, your subscription switches to "Pact – our yearly date" (€19/year). Until then, nothing changes. You can undo this from My Account.`)
            : t('Le passage au rendez-vous annuel est programmé à la fin de votre mois en cours.', 'The switch to the yearly date is scheduled for the end of your current month.')}
        </p>
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
          : t('Continuez l’aventure à deux : tous les modules et votre rendez-vous annuel, pour 19 € par an.', 'Keep the journey going together: every module and your yearly date, for €19 a year.')}
      </p>
      <div className="mb-4">
        <div className="font-fraunces font-bold" style={{ fontSize: 40, color: 'white' }}>19 <small style={{ fontSize: 18 }}>{t('€/an', '€/year')}</small></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{t('accès pendant 1 an · résiliable à tout moment', '1 year of access · cancel anytime')}</div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)', marginBottom: 16 }} />
      <div className="space-y-2 mb-6">
        {AVANTAGES.map((a, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.85)' }} />
            <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.92)' }}>{t(a, AVANTAGES_EN[i])}</span>
          </div>
        ))}
      </div>

      {mensuelEnCours && confirmer && (
        <p className="mb-4" style={{ fontSize: 13, color: 'white', background: 'rgba(0,0,0,.15)', padding: '10px 12px', borderRadius: 8 }}>
          {t(
            finPeriode
              ? `Rien ne change jusqu’à la fin de votre mois déjà payé. Le ${formaterDate(finPeriode, locale)}, votre abonnement mensuel s’arrête et passe à 19 €/an, prélevés ce jour-là sur la carte déjà enregistrée, pour 1 an d’accès.`
              : 'Rien ne change jusqu’à la fin de votre mois déjà payé. À cette date, votre abonnement mensuel s’arrête et passe à 19 €/an, prélevés sur la carte déjà enregistrée, pour 1 an d’accès.',
            finPeriode
              ? `Nothing changes until the end of the month you already paid for. On ${formaterDate(finPeriode, locale)}, your monthly subscription ends and switches to €19/year, charged that day to the card on file, for 1 year of access.`
              : 'Nothing changes until the end of the month you already paid for. On that date, your monthly subscription ends and switches to €19/year, charged to the card on file, for 1 year of access.'
          )}
        </p>
      )}

      {error && <p className="text-sm mb-4" style={{ color: '#fff', background: 'rgba(0,0,0,.2)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

      {!mensuelEnCours && <CaseRetractation onChange={setRenonciation} clair />}

      <button
        onClick={mensuelEnCours && !confirmer ? () => setConfirmer(true) : basculer}
        disabled={loading || (!mensuelEnCours && !renonciation)}
        className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg"
        style={{ background: 'white', color: 'var(--brand, #d63e7a)', fontSize: 14 }}
      >
        {loading
          ? t('Un instant…', 'One moment…')
          : mensuelEnCours && confirmer
          ? t('Je valide : passer à 19 €/an à la fin du mois', 'Confirm: switch to €19/year at the end of the month')
          : <>{t('Activer notre rendez-vous annuel — 19 €/an', 'Activate our yearly date — €19/year')} <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-center mt-3" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
        {t('Paiement sécurisé par Stripe · résiliable à tout moment depuis Mon compte · TVA non applicable, art. 293 B du CGI', 'Secure payment via Stripe · cancel anytime from My Account · VAT not applicable, art. 293 B of the French tax code')}
      </p>
    </div>
  )
}
