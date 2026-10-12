import YesBoxLogo from '@/components/YesBoxLogo'
import DesinscriptionClient from './DesinscriptionClient'
import { getLocale } from '@/lib/i18n/server'
import { isLocale } from '@/lib/i18n/locale'

export const metadata = { title: 'Ne plus recevoir les rappels' }

export default async function DesinscriptionPage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string; l?: string }> }) {
  const { u, s, l } = await searchParams
  // Langue de l'e-mail d'où vient le lien, sinon celle du navigateur.
  const locale = isLocale(l) ? l : await getLocale()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', maxWidth: 720, margin: '0 auto' }}>
        <YesBoxLogo size="sm" />
      </header>
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px' }}>
        <DesinscriptionClient userId={u ?? ''} signature={s ?? ''} locale={locale} />
      </main>
    </div>
  )
}
