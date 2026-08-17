import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isCouplePaired } from '@/lib/couple-status'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function PacteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const paired = await isCouplePaired(supabase, profile?.couple_id)

  return (
    <div className="min-h-screen bg-cream">
      <DashboardNav profile={profile} paired={paired} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
