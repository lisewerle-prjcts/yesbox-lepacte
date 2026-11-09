import type { Metadata } from 'next'

// Page utilitaire : inutile dans les résultats de recherche.
export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: true },
}

export default function MotDePasseOublieLayout({ children }: { children: React.ReactNode }) {
  return children
}
