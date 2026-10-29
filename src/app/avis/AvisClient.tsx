'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Check } from 'lucide-react'
import { envoyerAvis } from '@/app/actions/avis'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import { PRENOM_AVIS_MAX, TEXTE_AVIS_MAX } from '@/lib/avis-constantes'

interface AvisExistant {
  prenom: string
  debutMois: string
  note: number
  texte: string
  statut: 'en_attente' | 'publie' | 'refuse'
}

const PREMIERE_ANNEE = 2025

export default function AvisClient({ existant, prenomParDefaut, debutParDefaut }: { existant: AvisExistant | null; prenomParDefaut: string; debutParDefaut: string }) {
  const router = useRouter()
  const t = useT()
  const { locale } = useLocale()
  const [prenom, setPrenom] = useState(existant?.prenom ?? prenomParDefaut)
  const [annee, setAnnee] = useState((existant?.debutMois ?? debutParDefaut).slice(0, 4))
  const [mois, setMois] = useState((existant?.debutMois ?? debutParDefaut).slice(5, 7))
  const [note, setNote] = useState(existant?.note ?? 0)
  const [survol, setSurvol] = useState(0)
  const [texte, setTexte] = useState(existant?.texte ?? '')
  const [consentement, setConsentement] = useState(false)
  // Avis déjà envoyé (en attente ou publié) : remerciement, avec la
  // possibilité de corriger un avis encore en attente.
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'envoye'>(existant && existant.statut !== 'refuse' ? 'envoye' : 'idle')
  const [erreur, setErreur] = useState('')

  const maintenant = new Date()
  const anneeCourante = maintenant.getFullYear()
  const annees = Array.from({ length: Math.max(anneeCourante - PREMIERE_ANNEE + 1, 1) }, (_, i) => String(anneeCourante - i))
  const nomsMois = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, i, 15)).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', timeZone: 'UTC' }))

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (!note) { setErreur(t('Choisis une note de 1 à 5 étoiles.', 'Pick a rating from 1 to 5 stars.')); return }
    setStatut('envoi')
    const res = await envoyerAvis({ prenom, debutMois: `${annee}-${mois}`, note, texte, consentement })
    if ('error' in res) { setStatut('idle'); setErreur(res.error); return }
    setStatut('envoye')
    router.refresh()
  }

  const titre = (
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('Votre avis compte', 'Your review matters')}</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 560 }}>
        {t(
          'Racontez en quelques mots ce que la YES BOX a changé pour vous. Une fois votre avis publié sur le site, vous recevez par e-mail un code de 10 € de réduction sur votre prochain paiement.',
          'Tell us in a few words what YES BOX has changed for you. Once your review is published on the site, you get a €10 discount code by e-mail for your next payment.',
        )}
      </p>
    </div>
  )

  if (statut === 'envoye') {
    const publie = existant?.statut === 'publie'
    return (
      <div style={{ maxWidth: 640 }}>
        {titre}
        <div className="card p-6">
          <p className="flex items-center gap-2 font-semibold" style={{ color: 'var(--ink)' }}>
            <Check className="w-5 h-5" style={{ color: 'var(--sage)' }} />
            {publie ? t('Votre avis est publié : merci !', 'Your review is published: thank you!') : t('Merci ! Votre avis est bien reçu.', 'Thank you! Your review has been received.')}
          </p>
          <p className="mt-2" style={{ fontSize: 14, color: 'var(--muted)' }}>
            {publie
              ? t('Votre code de 10 € vous a été envoyé par e-mail. Saisissez-le dans Mon compte, rubrique « Ajouter un code ».', 'Your €10 code was sent to you by e-mail. Enter it in My Account, under "Add a code".')
              : t('Nous le relisons avant de le publier. Vous recevrez votre code de 10 € par e-mail dès sa publication.', 'We read it before publishing it. You will receive your €10 code by e-mail as soon as it is published.')}
          </p>
          <div className="flex gap-3 flex-wrap mt-5">
            {publie
              ? <Link href="/mon-compte" className="btn-brand text-sm">{t('Ajouter mon code', 'Add my code')}</Link>
              : <button type="button" onClick={() => setStatut('idle')} className="btn-secondary text-sm">{t('Modifier mon avis', 'Edit my review')}</button>}
            <Link href="/tableau-de-bord" className="btn-secondary text-sm">{t('Retour au tableau de bord', 'Back to dashboard')}</Link>
          </div>
        </div>
      </div>
    )
  }

  const noteAffichee = survol || note
  return (
    <div style={{ maxWidth: 640 }}>
      {titre}
      {existant?.statut === 'refuse' && (
        <p className="mb-4" style={{ fontSize: 13, color: 'var(--muted)' }}>
          {t('Votre précédent avis n’a pas été publié. Vous pouvez en écrire un nouveau.', 'Your previous review was not published. You can write a new one.')}
        </p>
      )}
      <form onSubmit={envoyer} className="card p-6 space-y-5">
        <div>
          <span className="flabel">{t('Votre note', 'Your rating')}</span>
          <div className="flex gap-1" role="radiogroup" aria-label={t('Note sur 5', 'Rating out of 5')} onMouseLeave={() => setSurvol(0)}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={note === n}
                aria-label={t(`${n} sur 5`, `${n} out of 5`)}
                onClick={() => setNote(n)}
                onMouseEnter={() => setSurvol(n)}
                className="p-1"
                style={{ color: n <= noteAffichee ? 'var(--brand)' : 'var(--muted-2)' }}
              >
                <Star className="w-8 h-8" fill={n <= noteAffichee ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="avis-texte" className="flabel">{t('Votre avis', 'Your review')}</label>
          <textarea
            id="avis-texte"
            className="field"
            rows={5}
            maxLength={TEXTE_AVIS_MAX}
            value={texte}
            onChange={e => setTexte(e.target.value)}
            placeholder={t('Ce que vous avez découvert, ce qui vous a plu, ce que ça a changé entre vous…', 'What you discovered, what you enjoyed, what it changed between you…')}
            required
          />
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>{texte.length} / {TEXTE_AVIS_MAX}</p>
        </div>

        <div>
          <label htmlFor="avis-prenom" className="flabel">{t('Prénom ou initiales', 'First name or initials')}</label>
          <input id="avis-prenom" className="field" value={prenom} maxLength={PRENOM_AVIS_MAX} onChange={e => setPrenom(e.target.value)} placeholder={t('Ex : Camille & Sam, ou C + S', 'E.g. Camille & Sam, or C + S')} required />
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('C’est le nom affiché sous votre avis.', 'This is the name shown under your review.')}</p>
        </div>

        <div>
          <span className="flabel">{t('Vous avez commencé la YES BOX en', 'You started YES BOX in')}</span>
          <div className="flex gap-2">
            <select className="field" value={mois} onChange={e => setMois(e.target.value)} aria-label={t('Mois', 'Month')}>
              {nomsMois.map((nom, i) => {
                const valeur = String(i + 1).padStart(2, '0')
                const futur = Number(annee) === anneeCourante && i > maintenant.getMonth()
                return <option key={valeur} value={valeur} disabled={futur}>{nom}</option>
              })}
            </select>
            <select className="field" value={annee} onChange={e => setAnnee(e.target.value)} aria-label={t('Année', 'Year')}>
              {annees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-start gap-2" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          <input type="checkbox" checked={consentement} onChange={e => setConsentement(e.target.checked)} className="mt-1" required />
          <span>
            {t(
              'J’accepte que mon avis soit publié sur yesbox-lepacte.fr avec mon prénom ou mes initiales, ma note et le mois où nous avons commencé. Je peux demander à le retirer à tout moment.',
              'I agree to my review being published on yesbox-lepacte.fr with my first name or initials, my rating and the month we started. I can ask for it to be removed at any time.',
            )}
          </span>
        </label>

        {erreur && <p role="alert" style={{ fontSize: 13, color: 'var(--brand-deep)' }}>{erreur}</p>}

        <button type="submit" disabled={statut === 'envoi'} className="btn-brand">
          {statut === 'envoi' ? t('Envoi…', 'Sending…') : existant?.statut === 'en_attente' ? t('Enregistrer les modifications', 'Save changes') : t('Envoyer mon avis', 'Send my review')}
        </button>
      </form>
    </div>
  )
}
