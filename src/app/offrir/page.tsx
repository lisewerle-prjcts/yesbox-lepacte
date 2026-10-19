import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { lirePrixCartesCadeaux } from '@/lib/cartes-cadeaux'
import OffrirClient from './OffrirClient'

export const metadata: Metadata = {
  title: 'Offrir YES BOX',
  description: 'Offrez 1, 2 ou 3 mois du programme YES BOX — Le Pacte à un couple, avec une carte cadeau à imprimer.',
}

export const dynamic = 'force-dynamic'

export default async function OffrirPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const [{ paiement }, prix] = await Promise.all([searchParams, lirePrixCartesCadeaux()])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <OffrirClient prix={prix} connecte={!!user} paiementAnnule={paiement === 'annule'} />
}
