'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { deconnexion } from '@/app/actions/auth'
import { Menu, X, LogOut, LayoutDashboard, ScrollText, BookOpen, ShieldCheck, UserCircle, Scale, Home, CalendarHeart } from 'lucide-react'

interface DashboardNavProps {
  profile: { prenom: string | null; email: string; couple_id: string | null; is_admin?: boolean | null } | null
  paired?: boolean
}

export default function DashboardNav({ profile }: DashboardNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const links = [
    // Page d'accueil publique du site, consultable sans se déconnecter.
    { href: '/', key: 'yesbox', label: 'Accueil', icon: <Home className="w-4 h-4" /> },
    { href: '/tableau-de-bord', key: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/pacte', key: 'pacte', label: 'Progression', icon: <ScrollText className="w-4 h-4" /> },
    { href: '/journal', key: 'journal', label: 'Notre Pacte', icon: <BookOpen className="w-4 h-4" /> },
    { href: '/rdv-annuels', key: 'rdvannuels', label: 'Nos rdv annuels', icon: <CalendarHeart className="w-4 h-4" /> },
    { href: '/mon-compte', key: 'moncompte', label: 'Mon compte', icon: <UserCircle className="w-4 h-4" /> },
    { href: '/regles-du-jeu', key: 'regles', label: 'Règles du jeu', icon: <Scale className="w-4 h-4" /> },
    ...(profile?.is_admin ? [{ href: '/admin', key: 'admin', label: 'Admin', icon: <ShieldCheck className="w-4 h-4" /> }] : []),
  ]

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,248,243,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flexShrink: 0 }}><YesBoxLogo size="sm" href="/tableau-de-bord" /></div>

        <nav className="hidden xl:flex items-center gap-0.5">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="flex items-center px-2 py-2 rounded-lg font-medium transition-all whitespace-nowrap"
              style={{ fontSize: 13.5, color: pathname === l.href ? 'var(--brand)' : 'var(--muted)', background: pathname === l.href ? 'var(--brand-tint)' : 'transparent' }}>
              {l.key === 'yesbox' && <EditableText id="dashboard.nav.accueil">Accueil</EditableText>}
              {l.key === 'dashboard' && <EditableText id="dashboard.nav.tableaudebord">Tableau de bord</EditableText>}
              {l.key === 'pacte' && <EditableText id="dashboard.nav.pacte">Progression</EditableText>}
              {l.key === 'journal' && <EditableText id="dashboard.nav.journal">Notre Pacte</EditableText>}
              {l.key === 'moncompte' && <EditableText id="dashboard.nav.moncompte">Mon compte</EditableText>}
              {l.key === 'regles' && <EditableText id="dashboard.nav.regles">Règles du jeu</EditableText>}
              {l.key === 'rdvannuels' && <EditableText id="dashboard.nav.rdvannuels">Nos rdv annuels</EditableText>}
              {l.key === 'admin' && <EditableText id="dashboard.nav.admin">Admin</EditableText>}
            </Link>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-2">
          <span className="hidden xl:inline text-sm whitespace-nowrap" style={{ color: 'var(--muted)' }}>
            {profile?.prenom || profile?.email}
          </span>
          <form action={deconnexion}>
            <button type="submit" className="flex items-center font-medium px-2 py-2 rounded-lg transition-all whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: 13.5 }}>
              <EditableText id="dashboard.nav.deconnexion">Déconnexion</EditableText>
            </button>
          </form>
        </div>

        <button className="xl:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '12px 24px' }} className="xl:hidden space-y-1">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: pathname === l.href ? 'var(--brand)' : 'var(--ink)' }}
              onClick={() => setOpen(false)}>
              {l.icon}
              {l.key === 'yesbox' && <EditableText id="dashboard.nav.accueil">Accueil</EditableText>}
              {l.key === 'dashboard' && <EditableText id="dashboard.nav.tableaudebord">Tableau de bord</EditableText>}
              {l.key === 'pacte' && <EditableText id="dashboard.nav.pacte">Progression</EditableText>}
              {l.key === 'journal' && <EditableText id="dashboard.nav.journal">Notre Pacte</EditableText>}
              {l.key === 'moncompte' && <EditableText id="dashboard.nav.moncompte">Mon compte</EditableText>}
              {l.key === 'regles' && <EditableText id="dashboard.nav.regles">Règles du jeu</EditableText>}
              {l.key === 'rdvannuels' && <EditableText id="dashboard.nav.rdvannuels">Nos rdv annuels</EditableText>}
              {l.key === 'admin' && <EditableText id="dashboard.nav.admin">Admin</EditableText>}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}>
            <form action={deconnexion}>
              <button type="submit" className="flex items-center gap-2 px-3 py-2 text-sm" style={{ color: 'var(--muted)' }}>
                <LogOut className="w-4 h-4" /><EditableText id="dashboard.nav.sedeconnecter">Se déconnecter</EditableText>
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
