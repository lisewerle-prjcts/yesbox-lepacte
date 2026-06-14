import type { Metadata } from 'next'
import { DM_Sans, Playfair_Display, DM_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const dmMono = DM_Mono({ subsets: ['latin'], variable: '--font-geist-mono', weight: ['400', '500'], display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-newsreader', style: ['normal', 'italic'], display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'YES BOX — Le pacte des couples qui tiennent', template: '%s | YES BOX' },
  description: 'Un programme en 7 modules pour poser les bases de votre couple, signer votre CDD de couple et vous retrouver chaque année. Module 1 gratuit. Lancement septembre 2026.',
  keywords: ['couple', 'mariage', 'préparation mariage', 'programme couple', 'CDD de couple', 'communication couple', 'vœux'],
  authors: [{ name: 'YES BOX' }],
  creator: 'YES BOX',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://yesbox-lepacte.fr',
    siteName: 'YES BOX — Le Pacte',
    title: 'YES BOX — Le pacte des couples qui tiennent',
    description: 'Un programme en 7 modules pour se choisir en conscience. Module 1 gratuit.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YES BOX — Le Pacte',
    description: 'Le programme pour les couples qui tiennent.',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://yesbox-lepacte.fr'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
