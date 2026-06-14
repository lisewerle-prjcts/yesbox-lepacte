import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'

export const metadata = { title: 'Tableau de bord' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (
    <div style={{ minHeight: '100vh' }}>
      <DashboardNav profile={profile} />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>{children}</main>
    </div>
  )
}
