import Logo from '@/components/Logo'
import { getLocale, getT } from '@/lib/i18n/server'

export const metadata = { title: 'Confirmer', robots: { index: false } }

// Page ouverte par le lien des e-mails (via /auth/confirm) : le jeton n'est
// utilisé qu'au clic sur le bouton, pour qu'un filtre de messagerie qui
// visite le lien à l'avance ne le consomme pas.
export default async function ConfirmerPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash: tokenHash = '', type = '' } = await searchParams
  const t = getT(await getLocale())
  const motDePasse = type === 'recovery'

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Logo size="md" className="inline-block mb-6" />
        <div className="card">
          <h1 className="font-fraunces text-2xl font-bold text-gray-900 mb-3">
            {motDePasse ? t('Choisir un nouveau mot de passe', 'Choose a new password') : t('Confirmer mon adresse e-mail', 'Confirm my email address')}
          </h1>
          <p className="text-gray-500 mb-6">
            {motDePasse
              ? t('Clique sur le bouton pour continuer.', 'Click the button to continue.')
              : t('Un dernier clic pour confirmer que cette adresse est bien la tienne.', 'One last click to confirm this address is yours.')}
          </p>
          <form method="post" action="/auth/confirm">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <button type="submit" disabled={!tokenHash} className="btn-primary w-full">
              {motDePasse ? t('Continuer', 'Continue') : t('Confirmer mon adresse', 'Confirm my address')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
