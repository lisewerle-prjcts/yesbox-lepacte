'use client'

import { useState } from 'react'
import { PenLine, Check } from 'lucide-react'
import { enregistrerPacteTexte } from '@/app/actions/couple'
import { useT } from '@/components/i18n/LocaleContext'

export default function PacteDocument({
  initialTexte,
  modifiePar,
  modifieLe,
}: {
  initialTexte: string
  modifiePar: string | null
  modifieLe: string | null
}) {
  const [texte, setTexte] = useState(initialTexte)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const t = useT()

  async function save() {
    setStatus('saving')
    const res = await enregistrerPacteTexte(texte)
    setStatus(res.error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{t('Complétez votre pacte', 'Complete your pact')}</h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        {t(
          'Un espace libre pour écrire ensemble vos engagements, vos règles de couple, ou tout ce que vous voulez vous promettre. Vous pouvez tous les deux le modifier.',
          'A free space to write your commitments, your rules as a couple, or anything you want to promise each other. You can both edit it.'
        )}
      </p>
      <textarea
        className="field"
        rows={8}
        placeholder={t(
          "Ex : Nous nous engageons à...\nNos règles à nous...\nCe qu'on se promet l'un à l'autre...",
          "E.g.: We commit to...\nOur own rules...\nWhat we promise each other..."
        )}
        value={texte}
        onChange={e => setTexte(e.target.value)}
      />
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <p style={{ fontSize: 12, color: 'var(--muted-2)' }}>
          {modifiePar && modifieLe
            ? t(
                `Dernière modification par ${modifiePar} le ${new Date(modifieLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                `Last edited by ${modifiePar} on ${new Date(modifieLe).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
              )
            : t('Pas encore modifié', 'Not edited yet')}
        </p>
        <button onClick={save} disabled={status === 'saving'} className="btn-brand text-sm py-2 px-4 flex items-center gap-2">
          {status === 'saving'
            ? t('Sauvegarde…', 'Saving…')
            : status === 'saved'
            ? <><Check className="w-4 h-4" /> {t('Sauvegardé', 'Saved')}</>
            : status === 'error'
            ? t('Erreur — réessaie', 'Error — try again')
            : t('Sauvegarder', 'Save')}
        </button>
      </div>
    </div>
  )
}
