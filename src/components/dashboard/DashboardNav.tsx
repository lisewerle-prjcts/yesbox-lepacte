'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'
import { deconnexion } from '@/app/actions/auth'
import { Menu, X, LogOut, Home, ScrollText, UserPlus } from 'lucide-react'

interface DashboardNavProps {
  profile: {
    prenom: string | null
    email: string
    couple_id: string | null
  } | null
}

export default function DashboardNav({ profile }: DashboardNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { href: '/tableau-de-bord', label: 'Accueil', icon: <Home className="w-4 h-4" /> },
    { href: '/pacte', label: 'Notre Pacte', icon: <ScrollText className="w-4 h-4" /> },
    ...(!profile?.couple_id ? [{ href: '/inviter-partenaire', label: 'Inviter mon/ma partenaire', icon: <UserPlus className="w-4 h-4" /> }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-cream-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo size="sm" href="/tableau-de-bord" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-magenta'
                  : 'text-gray-500 hover:text-magenta'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''} 👋
          </span>
          <form action={deconnexion}>
            <button type="submit" className="btn-ghost text-sm flex items-center gap-1.5">
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </form>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-500"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-cream-300 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <div className="border-t border-cream-300 pt-3">
            <span className="text-sm text-gray-400 block mb-2">
              {profile?.prenom || profile?.email}
            </span>
            <form action={deconnexion}>
              <button type="submit" className="flex items-center gap-2 text-sm text-gray-600">
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
