import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import DashboardNav from '@/components/dashboard/DashboardNav'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'

export const dynamic = 'force-dynamic'

export default async function JournalLayout({ children }: { children: React.ReactNode }) {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')

  return (
    <div style={{ minHeight: '100vh' }}>
      {session.isImpersonating && <ImpersonationBanner prenom={session.profile.prenom} email={session.profile.email} />}
      <DashboardNav profile={session.profile} />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>{children}</main>
    </div>
  )
}
