import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inscription',
  description: 'Créez votre espace YES BOX et commencez le module 1 gratuitement, à deux.',
  alternates: { canonical: '/inscription' },
}

export default function InscriptionLayout({ children }: { children: React.ReactNode }) {
  return children
}
