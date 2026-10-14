'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, CalendarHeart } from 'lucide-react'
import { signerPacte } from '@/app/actions/couple'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import EditableText from '@/components/edit-mode/EditableText'
import ChoixDateRdv, { formaterDate } from '@/components/pacte/ChoixDateRdv'

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
  const [date, setDate] = useState<string | null>(null)
  const [modifier, setModifier] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [erreur, setErreur] = useState('')

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
        <>
          <ChoixDateRdv bornes={{ min, max, parDefaut, anniversaire, saintValentin }} rdvLe={rdvLe} onDate={setDate} />

          {status === 'error' && <p role="alert" style={{ fontSize: 13, color: 'var(--brand-deep)', marginTop: 10 }}>{erreur}</p>}

          <div className="flex flex-wrap justify-center gap-2" style={{ marginTop: 24 }}>
            {signe && (
              <button type="button" onClick={() => setModifier(false)} className="btn-secondary">
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
        </>
      )}
    </div>
  )
}
