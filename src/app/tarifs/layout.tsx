import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs',
  description: 'Module 1 gratuit, pack initial à 58 € (les 8 modules et la signature de votre pacte de couple), puis un rendez-vous annuel facultatif à 19 €/an, sans engagement.',
  alternates: { canonical: '/tarifs' },
}

export default function TarifsLayout({ children }: { children: React.ReactNode }) {
  return children
}
