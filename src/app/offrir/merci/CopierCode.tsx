'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useT } from '@/components/i18n/LocaleContext'

export default function CopierCode({ code }: { code: string }) {
  const t = useT()
  const [copie, setCopie] = useState(false)

  async function copier() {
    await navigator.clipboard.writeText(code)
    setCopie(true)
    setTimeout(() => setCopie(false), 2500)
  }

  return (
    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl" style={{ border: '2px dashed var(--brand)', background: 'white' }}>
      <span className="font-mono font-bold" style={{ fontSize: 24, letterSpacing: '.12em', color: 'var(--ink)' }}>{code}</span>
      <button onClick={copier} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
        {copie ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copie ? t('Copié', 'Copied') : t('Copier', 'Copy')}
      </button>
    </div>
  )
}
