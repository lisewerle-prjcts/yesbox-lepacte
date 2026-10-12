import YesBoxLogo from '@/components/YesBoxLogo'
import DesinscriptionClient from './DesinscriptionClient'

export const metadata = { title: 'Ne plus recevoir les rappels' }

export default async function DesinscriptionPage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string }> }) {
  const { u, s } = await searchParams
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', maxWidth: 720, margin: '0 auto' }}>
        <YesBoxLogo size="sm" />
      </header>
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px' }}>
        <DesinscriptionClient userId={u ?? ''} signature={s ?? ''} />
      </main>
    </div>
  )
}
