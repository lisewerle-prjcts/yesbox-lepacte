'use client'

import { useT } from '@/components/i18n/LocaleContext'
import { formatAnswer } from '@/lib/questions'
import type { Question } from '@/types'

// Une question et les deux réponses côte à côte (page de révélation).
export default function ReponsesCoteACote({ q, maValeur, valeurAutre, myName, partnerName, reponsesPartagees }: {
  q: Question
  maValeur: string | undefined
  valeurAutre: string | undefined
  myName: string | null
  partnerName: string | null
  reponsesPartagees: boolean
}) {
  const t = useT()
  const myFmt = formatAnswer(q, maValeur)
  const partnerFmt = formatAnswer(q, valeurAutre)

  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark-muted)', marginBottom: 14, whiteSpace: 'pre-line' }}>{q.texte}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: '16px 18px', border: '1px solid var(--dark-line)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="av av-c" style={{ width: 26, height: 26, fontSize: 11 }}>{(myName || t('M', 'Y'))[0]}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-muted)' }}>{myName || t('Toi', 'You')}</span>
          </div>
          <p style={{ fontSize: 14, color: myFmt ? 'var(--dark-paper)' : 'var(--dark-muted)', fontStyle: myFmt ? 'normal' : 'italic', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {myFmt || t('— pas de réponse —', '— no answer yet —')}
          </p>
        </div>
        <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: '16px 18px', border: '1px solid var(--dark-line)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="av av-a" style={{ width: 26, height: 26, fontSize: 11 }}>{(partnerName || t('P', 'P'))[0]}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-muted)' }}>{partnerName || t('Partenaire', 'Partner')}</span>
          </div>
          <p style={{ fontSize: 14, color: partnerFmt ? 'var(--dark-paper)' : 'var(--dark-muted)', fontStyle: partnerFmt ? 'normal' : 'italic', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {partnerFmt || (reponsesPartagees
              ? t('— pas de réponse —', '— no answer yet —')
              : t('Visible quand vous aurez tous les deux répondu', 'Visible once you have both answered'))}
          </p>
        </div>
      </div>
    </div>
  )
}
