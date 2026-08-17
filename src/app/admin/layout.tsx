import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // Utilise le client admin (service role) pour bypasser RLS
  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient.from('profiles').select('is_admin').eq('id', user.id).single()

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--cream)' }}>
        <div className="card p-6 max-w-lg" style={{ borderColor: '#dc2626' }}>
          <h1 className="font-serif text-xl font-bold mb-2" style={{ color: '#dc2626' }}>Configuration admin incomplète</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 12 }}>
            Impossible de vérifier ton statut admin : <code style={{ background: 'var(--paper)', padding: '2px 6px', borderRadius: 4 }}>{profileError.message}</code>
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            C&apos;est généralement un problème de variable d&apos;environnement <code>SUPABASE_SERVICE_ROLE_KEY</code> manquante ou incorrecte
            dans les réglages du projet Vercel (Production). Vérifie qu&apos;elle correspond bien à la clé <em>service_role</em> de Supabase
            (Project Settings → API), puis redéploie.
          </p>
        </div>
      </div>
    )
  }

  if (!profile?.is_admin) redirect('/tableau-de-bord')

  const NAV = [
    { href: '/admin', label: 'Vue d\'ensemble' },
    { href: '/admin/utilisateurs', label: 'Utilisateurs' },
    { href: '/admin/couples', label: 'Couples & progression' },
    { href: '/admin/messages', label: 'Messages & emails' },
    { href: '/admin/actions', label: 'Actions manuelles' },
    { href: '/admin/securite', label: 'Sécurité' },
    { href: '/admin/voir-en-tant-que', label: 'Voir en tant que' },
    { href: '/admin/contenu', label: 'Contenu des modules' },
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
