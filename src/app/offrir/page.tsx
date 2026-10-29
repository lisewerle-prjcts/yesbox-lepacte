import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { lirePrixCartesCadeaux } from '@/lib/cartes-cadeaux'
import OffrirClient from './OffrirClient'

export const metadata: Metadata = {
  title: 'Un cadeau original pour un couple : offrir YES BOX',
  description: 'Un cadeau original pour un couple, la Saint-Valentin ou un anniversaire : le pack YES BOX – Le Pacte (58 €), 8 modules ludiques à deux et une carte à imprimer.',
  alternates: { canonical: '/offrir' },
}

export const dynamic = 'force-dynamic'

export default async function OffrirPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const [{ paiement }, prix] = await Promise.all([searchParams, lirePrixCartesCadeaux()])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <OffrirClient prix={prix} connecte={!!user} paiementAnnule={paiement === 'annule'} />
}
