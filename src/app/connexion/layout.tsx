import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre espace YES BOX — Le Pacte.',
  alternates: { canonical: '/connexion' },
  // Page de connexion : sans intérêt dans les résultats de recherche (Google
  // la signalait en « page en double »). Les liens restent suivis.
  robots: { index: false, follow: true },
}

export default function ConnexionLayout({ children }: { children: React.ReactNode }) {
  return children
}
