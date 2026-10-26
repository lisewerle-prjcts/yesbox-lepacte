import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre espace YES BOX — Le Pacte.',
  alternates: { canonical: '/connexion' },
}

export default function ConnexionLayout({ children }: { children: React.ReactNode }) {
  return children
}
