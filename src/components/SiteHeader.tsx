'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Menu, X } from 'lucide-react'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import LocaleFlagToggle from '@/components/i18n/LocaleFlagToggle'
import { createClient } from '@/lib/supabase/client'

// En-tête commun des pages publiques (accueil, pages thématiques, À propos,
// Offrir) : menu, connexion / inscription et choix de la langue.

const NAV_LINKS = (t: (fr: string, en: string) => string) => [
  { href: '#forwhom', key: 'forwhom', label: t('Pour qui', "Who it's for") },
  { href: '#modules', key: 'modules', label: t('Les modules', 'The modules') },
  { href: '#tarifs', key: 'tarifs', label: t('Tarifs', 'Pricing') },
  { href: '#faq', key: 'faq', label: t('FAQ', 'FAQ') },
  { href: '/offrir', key: 'offrir', label: t('Offrir', 'Give as a gift') },
  { href: '/a-propos', key: 'apropos', label: t('À propos', 'About') },
]

export default function SiteHeader({ sectionsSurPlace = false, onInscription }: {
  /** Les sections (#forwhom…) sont sur la page : liens d'ancre simples. Sinon, renvoi vers l'accueil. */
  sectionsSurPlace?: boolean
  /** Ouvre la fenêtre d'inscription de la page ; à défaut, renvoi vers /inscription. */
  onInscription?: () => void
}) {
  const t = useT()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  // Personne connectée : on lui propose de retourner à son espace plutôt que
  // de se connecter / s'inscrire.
  const [connecte, setConnecte] = useState(false)
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setConnecte(!!data.session))
  }, [])
  const navLinks = NAV_LINKS(t)
  const inscrire = () => (onInscription ? onInscription() : router.push('/inscription'))

  return (
    <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <YesBoxLogo size="sm" />
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, key, label }) => (
            <a key={href} href={sectionsSurPlace || !href.startsWith('#') ? href : `/${href}`} className="text-sm font-medium transition-colors" style={{ color: 'var(--muted)' }}>
              <EditableText id={`home.nav.${key}`}>{label}</EditableText>
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {connecte ? (
            <Link href="/tableau-de-bord" className="btn-brand text-sm py-2 px-4">
              <EditableText id="home.nav.monespace">Mon espace</EditableText> <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="btn-ghost text-sm py-2 px-4">
                <EditableText id="home.nav.seconnecter">Se connecter</EditableText>
              </Link>
              <button onClick={inscrire} className="btn-brand text-sm py-2 px-4">
                <EditableText id="home.nav.sinscrire">S&apos;inscrire</EditableText>
              </button>
            </>
          )}
          <LocaleFlagToggle />
        </div>
        <div className="md:hidden flex items-center gap-1">
          <LocaleFlagToggle />
          <button className="p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden space-y-3" style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '16px 24px' }}>
          {navLinks.map(({ href, key, label }) => (
            <a key={href} href={sectionsSurPlace || !href.startsWith('#') ? href : `/${href}`} className="block text-sm font-medium py-1" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>
              <EditableText id={`home.nav.${key}`}>{label}</EditableText>
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            {connecte ? (
              <Link href="/tableau-de-bord" className="btn-brand text-sm py-2 px-4 flex-1 justify-center">
                <EditableText id="home.nav.monespace">Mon espace</EditableText> <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="btn-ghost text-sm py-2 px-4 flex-1 justify-center">
                  <EditableText id="home.nav.connexion.mobile">Connexion</EditableText>
                </Link>
                <button onClick={() => { setMenuOpen(false); inscrire() }} className="btn-brand text-sm py-2 px-4 flex-1 justify-center">
                  <EditableText id="home.nav.sinscrire">S&apos;inscrire</EditableText>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
