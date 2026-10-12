'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, CalendarHeart } from 'lucide-react'
import { signerPacte } from '@/app/actions/couple'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import EditableText from '@/components/edit-mode/EditableText'
import { prochaineDateDansBornes } from '@/lib/rdv-annuel'

type Option = 'un_an' | 'saint_valentin' | 'perso'

function formaterDate(date: string, locale: string) {
  // Date AAAA-MM-JJ lue en UTC pour éviter un décalage d'un jour.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SignaturePacte({
  signeLe,
  rdvLe,
  rdvOuvert,
  min,
  max,
  parDefaut,
  anniversaire,
  saintValentin,
}: {
  signeLe: string | null
  rdvLe: string | null
  /** Le module 10 est déjà ouvert : la date ne se change plus. */
  rdvOuvert: boolean
  min: string
  max: string
  parDefaut: string
  /** Prochaine date anniversaire du couple comprise entre min et max. */
  anniversaire: string | null
  /** Prochaine Saint-Valentin comprise entre min et max (null sinon). */
  saintValentin: string | null
}) {
  const router = useRouter()
  const t = useT()
  const { locale } = useLocale()
  // Choix déjà fait (changement de date) : on retrouve l'option cochée.
  function optionDe(d: string | null): Option {
    if (!d || d === parDefaut) return 'un_an'
    if (d === saintValentin) return 'saint_valentin'
    return 'perso'
  }
  const datePerso = rdvLe && optionDe(rdvLe) === 'perso' ? rdvLe : anniversaire
  const [option, setOption] = useState<Option>(optionDe(rdvLe))
  const [jour, setJour] = useState(datePerso ? datePerso.slice(8, 10) : '')
  const [mois, setMois] = useState(datePerso ? datePerso.slice(5, 7) : '')
  const [modifier, setModifier] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [erreur, setErreur] = useState('')

  const jjMmSaisis = /^\d{1,2}$/.test(jour) && /^\d{1,2}$/.test(mois)
  const dateDuPerso = jjMmSaisis ? prochaineDateDansBornes(Number(mois), Number(jour), min, max) : null
  const date = option === 'un_an' ? parDefaut : option === 'saint_valentin' ? saintValentin : dateDuPerso

  async function valider() {
    if (!date) return
    setStatus('saving')
    const res = await signerPacte(date)
    if (res.error) {
      setStatus('error')
      setErreur(res.error)
      return
    }
    setStatus('idle')
    setModifier(false)
    router.refresh()
  }

  const signe = !!signeLe
  const afficherChoix = !signe || (modifier && !rdvOuvert)

  return (
    <div className="card p-5 text-center" style={{ marginTop: 24, paddingTop: 40, paddingBottom: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>💍</div>
      <h2 className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 12 }}>
        {signe
          ? <EditableText id="pacte.signe.titre">Votre Pacte est signé</EditableText>
          : <EditableText id="pacte.signature.titre">Signez votre Pacte</EditableText>}
      </h2>

      {signe ? (
        <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto 8px' }}>
          {t(`Signé le ${formaterDate(signeLe!.slice(0, 10), locale)}.`, `Signed on ${formaterDate(signeLe!.slice(0, 10), locale)}.`)}
        </p>
      ) : (
        <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto 24px' }}>
          <EditableText id="pacte.signature.texte" multiline>En signant, vous vous engagez à honorer les valeurs et accords explorés ensemble.</EditableText>
        </p>
      )}

      {signe && rdvLe && !modifier && (
        <div style={{ maxWidth: 420, margin: '16px auto 0' }}>
          <p className="flex items-center justify-center gap-2" style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>
            <CalendarHeart className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            {t(`Votre rendez-vous annuel : le ${formaterDate(rdvLe, locale)}`, `Your yearly date: ${formaterDate(rdvLe, locale)}`)}
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            {rdvOuvert
              ? <EditableText id="pacte.rdv.ouvert">Le module « Notre rendez-vous annuel » est ouvert.</EditableText>
              : <EditableText id="pacte.rdv.attente" multiline>Le module « Notre rendez-vous annuel » se débloquera à cette date.</EditableText>}
          </p>
          {!rdvOuvert && (
            <button type="button" onClick={() => setModifier(true)} className="btn-secondary text-sm py-2" style={{ marginTop: 16 }}>
              <EditableText id="pacte.rdv.modifier">Changer la date</EditableText>
            </button>
          )}
        </div>
      )}

      {afficherChoix && (
        <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
            <span id="rdv-annuel-label"><EditableText id="pacte.rdv.label">La date de votre rendez-vous annuel</EditableText></span>
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            <EditableText id="pacte.rdv.aide.options" multiline>Le module « Notre rendez-vous annuel » se débloquera ce jour-là, entre 6 mois et 1 an après la signature. Choisissez ensemble la date qui vous ressemble :</EditableText>
          </p>
          <div role="radiogroup" aria-labelledby="rdv-annuel-label" className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer card p-3" style={{ borderColor: option === 'un_an' ? 'var(--brand)' : undefined }}>
              <input type="radio" name="rdv-annuel" checked={option === 'un_an'} onChange={() => setOption('un_an')} className="mt-1" />
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                <EditableText id="pacte.rdv.option.unan">Dans un an à partir d’aujourd’hui</EditableText>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>{t(`le ${formaterDate(parDefaut, locale)}`, `on ${formaterDate(parDefaut, locale)}`)}</span>
              </span>
            </label>
            <label className={`flex items-start gap-3 card p-3 ${saintValentin ? 'cursor-pointer' : ''}`} style={{ borderColor: option === 'saint_valentin' ? 'var(--brand)' : undefined, opacity: saintValentin ? 1 : 0.55 }}>
              <input type="radio" name="rdv-annuel" checked={option === 'saint_valentin'} disabled={!saintValentin} onChange={() => setOption('saint_valentin')} className="mt-1" />
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                <EditableText id="pacte.rdv.option.saintvalentin">À la Saint-Valentin</EditableText>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>
                  {saintValentin
                    ? t(`le ${formaterDate(saintValentin, locale)}`, `on ${formaterDate(saintValentin, locale)}`)
                    : t('pas de 14 février entre 6 mois et 1 an d’ici', 'no February 14 between 6 months and 1 year from now')}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer card p-3" style={{ borderColor: option === 'perso' ? 'var(--brand)' : undefined }}>
              <input type="radio" name="rdv-annuel" checked={option === 'perso'} onChange={() => setOption('perso')} className="mt-1" />
              <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>
                <EditableText id="pacte.rdv.option.perso">À une date qui vous est propre</EditableText>
                <span className="flex items-center gap-2" style={{ marginTop: 8 }}>
                  <input
                    type="text" inputMode="numeric" maxLength={2} placeholder={t('JJ', 'DD')} aria-label={t('Jour', 'Day')}
                    className="field" style={{ width: 64, textAlign: 'center' }}
                    value={jour} onFocus={() => setOption('perso')} onChange={e => setJour(e.target.value.replace(/\D/g, ''))}
                  />
                  <span style={{ color: 'var(--muted)' }}>/</span>
                  <input
                    type="text" inputMode="numeric" maxLength={2} placeholder={t('MM', 'MM')} aria-label={t('Mois', 'Month')}
                    className="field" style={{ width: 64, textAlign: 'center' }}
                    value={mois} onFocus={() => setOption('perso')} onChange={e => setMois(e.target.value.replace(/\D/g, ''))}
                  />
                </span>
                {option === 'perso' && jjMmSaisis && (
                  <span style={{ display: 'block', fontSize: 12.5, marginTop: 6, color: dateDuPerso ? 'var(--muted)' : 'var(--brand-deep)' }}>
                    {dateDuPerso
                      ? t(`le ${formaterDate(dateDuPerso, locale)}`, `on ${formaterDate(dateDuPerso, locale)}`)
                      : t(`Cette date ne tombe pas entre le ${formaterDate(min, locale)} et le ${formaterDate(max, locale)}. Choisissez-en une autre.`, `This date doesn't fall between ${formaterDate(min, locale)} and ${formaterDate(max, locale)}. Please pick another one.`)}
                  </span>
                )}
              </span>
            </label>
          </div>

          {status === 'error' && <p role="alert" style={{ fontSize: 13, color: 'var(--brand-deep)', marginTop: 10 }}>{erreur}</p>}

          <div className="flex flex-wrap justify-center gap-2" style={{ marginTop: 24 }}>
            {signe && (
              <button type="button" onClick={() => { setModifier(false); setOption(optionDe(rdvLe)) }} className="btn-secondary">
                {t('Annuler', 'Cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={valider}
              disabled={status === 'saving' || !date}
              className="btn-brand"
              style={{ padding: '16px 32px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {!signe && <Heart className="w-5 h-5" />}
              {status === 'saving'
                ? t('Enregistrement…', 'Saving…')
                : signe
                ? <EditableText id="pacte.rdv.enregistrer">Enregistrer la date</EditableText>
                : <EditableText id="pacte.signature.cta">Signer notre Pacte</EditableText>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
