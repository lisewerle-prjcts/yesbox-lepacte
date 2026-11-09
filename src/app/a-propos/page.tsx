import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AProposClient from './AProposClient'

export const metadata: Metadata = {
  title: 'À propos : de la White Box à YES BOX',
  description: 'L’histoire de YES BOX – Le Pacte : un coffret créé il y a plus de dix ans, qui renaît en ligne pour aider tous les couples à se redire oui, chaque année.',
  alternates: { canonical: '/a-propos' },
  openGraph: { url: '/a-propos' },
}

export default async function APropos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <AProposClient connecte={!!user} />
}
