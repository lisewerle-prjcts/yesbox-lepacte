import Link from 'next/link'
import Logo from '@/components/Logo'
import { getLocale, getT } from '@/lib/i18n/server'

export default async function NotFound() {
  const t = getT(await getLocale())
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 text-center">
      <Logo size="md" className="mb-8" />
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="font-fraunces text-3xl font-bold text-gray-900 mb-3">
        {t('Page introuvable', 'Page not found')}
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        {t("Cette page n'existe pas ou a été déplacée.", "This page doesn't exist or has been moved.")}
      </p>
      <Link href="/" className="btn-primary">
        {t("Retourner à l'accueil", 'Back to home')}
      </Link>
    </div>
  )
}
