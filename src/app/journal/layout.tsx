import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function JournalLayout({ children }: { children: React.ReactNode }) {
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
