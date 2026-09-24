import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isCouplePaired } from '@/lib/couple-status'
import DashboardNav from '@/components/dashboard/DashboardNav'
import { aDonneSonConsentement } from '@/lib/consentement'

export default async function ModuleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!aDonneSonConsentement(profile)) redirect('/consentement')
  const paired = await isCouplePaired(supabase, profile?.couple_id)
  return (
    <div style={{ minHeight: '100vh' }}>
      <DashboardNav profile={profile} paired={paired} />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>{children}</main>
    </div>
  )
}
