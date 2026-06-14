'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import YesBoxLogo from '@/components/YesBoxLogo'
import { deconnexion } from '@/app/actions/auth'
import { Menu, X, LogOut, LayoutDashboard, ScrollText, BookOpen, UserPlus } from 'lucide-react'

interface DashboardNavProps {
  profile: { prenom: string | null; email: string; couple_id: string | null } | null
}

export default function DashboardNav({ profile }: DashboardNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const links = [
    { href: '/tableau-de-bord', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/pacte', label: 'Notre Pacte', icon: <ScrollText className="w-4 h-4" /> },
    { href: '/journal', label: 'Journal', icon: <BookOpen className="w-4 h-4" /> },
    ...(!profile?.couple_id ? [{ href: '/inviter-partenaire', label: 'Inviter', icon: <UserPlus className="w-4 h-4" /> }] : []),
  ]

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,248,243,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <YesBoxLogo size="sm" href="/tableau-de-bord" />

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ color: pathname === l.href ? 'var(--brand)' : 'var(--muted)', background: pathname === l.href ? 'var(--brand-tint)' : 'transparent' }}>
              {l.icon}{l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {profile?.prenom || profile?.email}
          </span>
          <form action={deconnexion}>
            <button type="submit" className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--muted)' }}>
              <LogOut className="w-4 h-4" />Déconnexion
            </button>
          </form>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '12px 24px' }} className="md:hidden space-y-1">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: pathname === l.href ? 'var(--brand)' : 'var(--ink)' }}
              onClick={() => setOpen(false)}>
              {l.icon}{l.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}>
            <form action={deconnexion}>
              <button type="submit" className="flex items-center gap-2 px-3 py-2 text-sm" style={{ color: 'var(--muted)' }}>
                <LogOut className="w-4 h-4" />Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
