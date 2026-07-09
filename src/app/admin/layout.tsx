import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // Utilise le client admin (service role) pour bypasser RLS
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/tableau-de-bord')

  const NAV = [
    { href: '/admin', label: 'Vue d\'ensemble' },
    { href: '/admin/couples', label: 'Couples & progression' },
    { href: '/admin/messages', label: 'Messages & emails' },
    { href: '/admin/actions', label: 'Actions manuelles' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header style={{ background: 'var(--dark)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <YesBoxLogo size="sm" dark />
            <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'var(--brand)', color: 'white', letterSpacing: '.06em' }}>ADMIN</span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded text-xs font-medium transition-colors" style={{ color: 'rgba(255,255,255,.6)' }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/tableau-de-bord" className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>← App</Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
