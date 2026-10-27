import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { marquerAdresseConfirmee } from '@/lib/adresse-confirmee'
import { envoyerBienvenueSiEnAttente } from '@/lib/welcome-email'

// Lien du mail de confirmation envoyé par notre Gmail (cf. lib/confirmation-email).
// Contrairement à /auth/callback, il fonctionne même ouvert dans un autre
// navigateur que celui de l'inscription.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')
  const type = typeParam === 'signup' || typeParam === 'magiclink' || typeParam === 'recovery' ? typeParam : null

  if (tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      // Mot de passe oublié : session ouverte, il reste à choisir le nouveau.
      if (type === 'recovery') return NextResponse.redirect(`${origin}/nouveau-mot-de-passe`)
      if (data.user) {
        // Le lien vient du mail envoyé à cette adresse : elle est vérifiée.
        if (data.user.app_metadata?.adresse_a_confirmer) await marquerAdresseConfirmee(createAdminClient(), data.user.id)
        await envoyerBienvenueSiEnAttente(data.user.id)
      }
      return NextResponse.redirect(`${origin}/tableau-de-bord?adresse_confirmee=1`)
    }
    if (type === 'recovery') return NextResponse.redirect(`${origin}/mot-de-passe-oublie?expire=1`)
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_error`)
}
