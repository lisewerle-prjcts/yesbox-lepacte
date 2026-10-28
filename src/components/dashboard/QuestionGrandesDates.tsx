'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { CalendarHeart } from 'lucide-react'
import { updateDateAnniversaire, updateDateMariage, marquerMariageNonConcerne } from '@/app/actions/compte'
import { ChoixDate } from '@/components/dashboard/VotreCoupleCard'
import { useT } from '@/components/i18n/LocaleContext'

const DATE_COMPLETE = /^\d{4}-\d{2}-\d{2}$/

// Fenêtre ouverte sur le tableau de bord quand le couple n'a pas encore
// indiqué son anniversaire de couple ou sa date de mariage : la question est
// posée une fois par connexion (repérée par la date de connexion du compte),
// jusqu'à ce que les dates soient renseignées. « Nous ne sommes pas marié·es »
// est enregistré pour ne plus demander la date de mariage.
export default function QuestionGrandesDates({
  userId,
  connexionLe,
  demanderAnniversaire,
  demanderMariage,
}: {
  userId: string
  connexionLe: string
  demanderAnniversaire: boolean
  demanderMariage: boolean
}) {
  const t = useT()
  const router = useRouter()
  const [ouverte, setOuverte] = useState(false)
  const [anniversaire, setAnniversaire] = useState('')
  const [mariage, setMariage] = useState('')
  const [pasMarie, setPasMarie] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(false)
  const cle = `grandes-dates-demandees:${userId}`

  useEffect(() => {
    let dejaDemande = false
    try { dejaDemande = localStorage.getItem(cle) === connexionLe } catch {}
    if (dejaDemande) return
    setOuverte(true)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [cle, connexionLe])

  function fermer() {
    try { localStorage.setItem(cle, connexionLe) } catch {}
    document.body.style.overflow = ''
    setOuverte(false)
  }

  async function enregistrer() {
    setEnvoi(true)
    setErreur(false)
    const resultats = await Promise.all([
      demanderAnniversaire && DATE_COMPLETE.test(anniversaire) ? updateDateAnniversaire(anniversaire) : null,
      demanderMariage && pasMarie ? marquerMariageNonConcerne() : null,
      demanderMariage && !pasMarie && DATE_COMPLETE.test(mariage) ? updateDateMariage(mariage) : null,
    ])
    setEnvoi(false)
    if (resultats.some(r => r?.error)) {
      setErreur(true)
      return
    }
    fermer()
    router.refresh()
  }

  if (!ouverte) return null

  const incomplete = (d: string) => !!d && !DATE_COMPLETE.test(d)
  const rien = !DATE_COMPLETE.test(anniversaire) && !DATE_COMPLETE.test(mariage) && !pasMarie
  const bloque = envoi || rien || incomplete(anniversaire) || (!pasMarie && incomplete(mariage))

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-grandes-dates-titre"
      className="fixed inset-0 overflow-y-auto flex items-center justify-center"
      style={{ zIndex: 150, background: 'rgba(30,20,25,0.45)', padding: 16 }}
    >
      <div className="card p-6" style={{ width: '100%', maxWidth: 480, background: 'var(--paper)' }}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarHeart className="w-5 h-5" style={{ color: 'var(--brand)' }} />
          <h2 id="question-grandes-dates-titre" style={{ fontFamily: 'var(--font-newsreader)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
            {t('Nos grandes dates', 'Our big dates')}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          {t('Indiquez vos dates de couple : nous vous écrirons pour les célébrer avec vous.', 'Tell us your couple dates: we will write to you to celebrate them together.')}
        </p>

        {demanderAnniversaire && (
          <div className="mb-4">
            <label className="flabel">{t('Anniversaire de couple', 'Couple anniversary')}</label>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -2, marginBottom: 6 }}>{t('Le jour où tout a commencé', 'The day it all began')}</p>
            <ChoixDate value={anniversaire} onChange={setAnniversaire} />
          </div>
        )}

        {demanderMariage && (
          <div className="mb-4">
            <label className="flabel">{t('Date de mariage', 'Wedding date')}</label>
            {!pasMarie && <ChoixDate value={mariage} onChange={setMariage} />}
            <label className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={pasMarie} onChange={e => setPasMarie(e.target.checked)} />
              {t('Nous ne sommes pas marié·es', 'We are not married')}
            </label>
          </div>
        )}

        {erreur && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 8 }}>{t("L'enregistrement a échoué, réessaie.", 'Saving failed, please try again.')}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={fermer} className="btn-ghost text-sm py-2 px-4">{t('Plus tard', 'Later')}</button>
          <button type="button" onClick={enregistrer} disabled={bloque} className="btn-brand text-sm py-2 px-4">
            {envoi ? '…' : t('Enregistrer', 'Save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
