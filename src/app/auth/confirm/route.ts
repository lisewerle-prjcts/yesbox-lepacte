import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { envoyerBienvenueSiEnAttente } from '@/lib/welcome-email'

// Lien du mail de confirmation envoyé par notre Gmail (cf. lib/confirmation-email).
// Contrairement à /auth/callback, il fonctionne même ouvert dans un autre
// navigateur que celui de l'inscription.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')
  const type = typeParam === 'signup' || typeParam === 'magiclink' ? typeParam : null

  if (tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      if (data.user) await envoyerBienvenueSiEnAttente(data.user.id)
      return NextResponse.redirect(`${origin}/tableau-de-bord`)
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_error`)
}
