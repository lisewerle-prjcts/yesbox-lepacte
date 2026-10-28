import type { Metadata } from 'next'
import { DM_Sans, Playfair_Display, DM_Mono } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { getSiteContentMap } from '@/lib/site-content'
import { getLocale } from '@/lib/i18n/server'
import { EditModeProvider } from '@/components/edit-mode/EditModeContext'
import EditModeToggle from '@/components/edit-mode/EditModeToggle'
import { LocaleProvider } from '@/components/i18n/LocaleContext'
import GlobalLocaleSwitcher from '@/components/i18n/GlobalLocaleSwitcher'
import { SITE_URL } from '@/lib/site'
import { jsonLd, organisation, siteWeb } from '@/lib/donnees-structurees'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const dmMono = DM_Mono({ subsets: ['latin'], variable: '--font-geist-mono', weight: ['400', '500'], display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-newsreader', style: ['normal', 'italic'], display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'YES BOX — Le Pacte des couples qui tiennent', template: '%s | YES BOX' },
  description: 'Les non-dits s\'accumulent sans bruit. YES BOX aide tous les couples à les poser sur la table, sans thérapeute et sans pression, puis à écrire leur pacte de couple. Module 1 gratuit.',
  keywords: ['couple', 'mariage', 'préparation mariage', 'non-dits couple', 'programme couple', 'pacte de couple', 'communication couple'],
  authors: [{ name: 'YES BOX' }],
  creator: 'YES BOX',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'YES BOX — Le Pacte',
    title: 'YES BOX — Le pacte des couples qui tiennent',
    description: 'Des modules simples et ludiques pour parler de ce qui compte, sans thérapeute et sans pression. Module 1 gratuit.',
  },
  twitter: { card: 'summary_large_image', title: 'YES BOX — Le Pacte', description: 'Le programme pour les couples qui tiennent.' },
  robots: { index: true, follow: true },
  // Validation du site dans Bing Webmaster Tools.
  verification: { other: { 'msvalidate.01': 'E3E4F89327CE9F06363EFF17E989F742' } },
  metadataBase: new URL(SITE_URL),
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    isAdmin = !!profile?.is_admin
  }

  const content = await getSiteContentMap()
  const locale = await getLocale()

  return (
    <html lang={locale} className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organisation)} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(siteWeb)} />
        <LocaleProvider initialLocale={locale}>
          <EditModeProvider isAdmin={isAdmin} initialContent={content}>
            {children}
            <EditModeToggle />
            <GlobalLocaleSwitcher />
          </EditModeProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
