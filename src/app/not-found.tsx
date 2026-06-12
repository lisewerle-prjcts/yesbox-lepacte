import Link from 'next/link'
import Logo from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 text-center">
      <Logo size="md" className="mb-8" />
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="font-fraunces text-3xl font-bold text-gray-900 mb-3">
        Page introuvable
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link href="/" className="btn-primary">
        Retourner à l'accueil
      </Link>
    </div>
  )
}
