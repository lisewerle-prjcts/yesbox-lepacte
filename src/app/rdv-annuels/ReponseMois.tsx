'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'
import { enregistrerReponseMois } from '@/app/actions/rdv-annuels'

export default function ReponseMois({ mois, prenom, initiale }: { mois: number; prenom: string; initiale: string }) {
  const t = useT()
  const [valeur, setValeur] = useState(initiale)
  const [enregistree, setEnregistree] = useState(initiale)
  const [statut, setStatut] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    setErreur('')
    setStatut('saving')
    const res = await enregistrerReponseMois(mois, valeur)
    if (res.error) { setErreur(res.error); setStatut('idle'); return }
    setEnregistree(valeur)
    setStatut('saved')
    setTimeout(() => setStatut('idle'), 2500)
  }

  const modifiee = valeur.trim() !== enregistree.trim()

  return (
    <div>
      <label className="label">{prenom}</label>
      <textarea
        className="input-field"
        rows={3}
        maxLength={4000}
        placeholder={t('Ta réponse…', 'Your answer…')}
        value={valeur}
        onChange={e => setValeur(e.target.value)}
      />
      <div className="flex items-center gap-3 mt-2">
        <button onClick={enregistrer} disabled={statut === 'saving' || !modifiee} className="btn-secondary text-sm py-1.5 px-4">
          {statut === 'saving' ? t('Enregistrement…', 'Saving…') : t('Enregistrer', 'Save')}
        </button>
        {statut === 'saved' && <span className="text-sm flex items-center gap-1" style={{ color: 'var(--sage)' }}><Check className="w-4 h-4" /> {t('Enregistré', 'Saved')}</span>}
        {erreur && <span className="text-sm text-red-600">{erreur}</span>}
      </div>
    </div>
  )
}
