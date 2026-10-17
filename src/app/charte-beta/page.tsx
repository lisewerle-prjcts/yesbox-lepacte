import type { Metadata } from 'next'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import CharteBeta from '@/components/CharteBeta'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { charteBetaManquante } from '@/lib/charte-beta'
import AcceptationCharteBeta from './AcceptationCharteBeta'

export const metadata: Metadata = {
  title: 'Charte de la bêta',
  robots: { index: false, follow: false },
}

// Lisible par tout le monde. Une personne connectée dont le couple utilise le
// code BETANLR26 sans avoir encore accepté la charte (en général le ou la
// partenaire qui a rejoint avec le code couple) y est redirigée par les
// layouts de l'espace couple, et l'accepte ici.
export default async function CharteBetaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }
  const aAccepter = await charteBetaManquante(createAdminClient(), profile)

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          {!aAccepter && (
            <Link href={user ? '/tableau-de-bord' : '/'} className="btn-ghost text-sm py-2 px-4">← Retour</Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <CharteBeta />
        {aAccepter && <AcceptationCharteBeta />}
      </main>
    </div>
  )
}
