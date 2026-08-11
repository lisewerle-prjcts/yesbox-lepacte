import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import BienvenueClient from '@/components/BienvenueClient'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Bienvenue' }

export default async function BienvenuePage() {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  if (session.profile.intro_vue) redirect('/tableau-de-bord')

  return <BienvenueClient prenomInitial={session.profile.prenom} />
}
