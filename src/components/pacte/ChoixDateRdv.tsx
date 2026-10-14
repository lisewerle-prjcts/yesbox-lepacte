'use client'

import { useEffect, useState } from 'react'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import EditableText from '@/components/edit-mode/EditableText'
import { prochaineDateDansBornes } from '@/lib/rdv-annuel'

type Option = 'un_an' | 'saint_valentin' | 'perso'

export function formaterDate(date: string, locale: string) {
  // Date AAAA-MM-JJ lue en UTC pour éviter un décalage d'un jour.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export interface BornesRdv {
  min: string
  max: string
  parDefaut: string
  /** Prochaine date anniversaire du couple comprise entre min et max. */
  anniversaire: string | null
  /** Prochaine Saint-Valentin comprise entre min et max (null sinon). */
  saintValentin: string | null
}

// Choix de la date du rendez-vous annuel (déblocage du module 10) : dans un
// an, à la Saint-Valentin ou à une date propre au couple. Renvoie la date
// choisie (AAAA-MM-JJ), ou null tant qu'elle n'est pas valide.
export default function ChoixDateRdv({ bornes, rdvLe, onDate }: { bornes: BornesRdv; rdvLe: string | null; onDate: (date: string | null) => void }) {
  const t = useT()
  const { locale } = useLocale()
  const { min, max, parDefaut, anniversaire, saintValentin } = bornes
  // Choix déjà fait (changement de date) : on retrouve l'option cochée.
  const optionInitiale: Option = !rdvLe || rdvLe === parDefaut ? 'un_an' : rdvLe === saintValentin ? 'saint_valentin' : 'perso'
  const datePerso = rdvLe && optionInitiale === 'perso' ? rdvLe : anniversaire
  const [option, setOption] = useState<Option>(optionInitiale)
  const [jour, setJour] = useState(datePerso ? datePerso.slice(8, 10) : '')
  const [mois, setMois] = useState(datePerso ? datePerso.slice(5, 7) : '')

  const jjMmSaisis = /^\d{1,2}$/.test(jour) && /^\d{1,2}$/.test(mois)
  const dateDuPerso = jjMmSaisis ? prochaineDateDansBornes(Number(mois), Number(jour), min, max) : null
  const date = option === 'un_an' ? parDefaut : option === 'saint_valentin' ? saintValentin : dateDuPerso

  useEffect(() => { onDate(date) }, [date, onDate])

  return (
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
    </div>
  )
}
