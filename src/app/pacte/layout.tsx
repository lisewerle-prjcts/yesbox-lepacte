import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import DashboardNav from '@/components/dashboard/DashboardNav'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'

export default async function PacteLayout({ children }: { children: React.ReactNode }) {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')

  return (
    <div className="min-h-screen bg-cream">
      {session.isImpersonating && <ImpersonationBanner prenom={session.profile.prenom} email={session.profile.email} />}
      <DashboardNav profile={session.profile} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
