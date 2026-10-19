'use client'

import { Download } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'

export default function BoutonImprimer() {
  const t = useT()
  return (
    <button onClick={() => window.print()} className="btn-brand">
      <Download className="w-4 h-4" /> {t('Télécharger / imprimer la carte (PDF)', 'Download / print the card (PDF)')}
    </button>
  )
}
