'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from '@/components/i18n/LocaleContext'

// Case anti-robot Cloudflare Turnstile (inscription). Le jeton est ajouté au
// formulaire dans le champ caché « cf-turnstile-response », vérifié côté
// serveur (src/lib/limites.ts). Sans NEXT_PUBLIC_TURNSTILE_SITE_KEY, rien
// n'est affiché.

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: Turnstile }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function chargerScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('Turnstile indisponible')))
  })
}

// `essai` : à changer pour obtenir un nouveau jeton (un jeton ne sert qu'une
// fois, par exemple après une erreur d'inscription).
export default function AntiRobot({ essai = 0 }: { essai?: number }) {
  const cle = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const conteneur = useRef<HTMLDivElement>(null)
  const { locale } = useLocale()

  useEffect(() => {
    if (!cle || !conteneur.current) return
    let id: string | null = null
    let annule = false
    chargerScript().then(() => {
      if (annule || !conteneur.current || !window.turnstile) return
      id = window.turnstile.render(conteneur.current, {
        sitekey: cle,
        language: locale,
        theme: 'light',
        'response-field-name': 'cf-turnstile-response',
      })
    }).catch(() => {})
    return () => {
      annule = true
      if (id && window.turnstile) window.turnstile.remove(id)
    }
  }, [cle, locale, essai])

  if (!cle) return null
  return <div ref={conteneur} style={{ minHeight: 65 }} />
}
