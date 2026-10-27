import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { envoyerBienvenueSiEnAttente } from '@/lib/welcome-email'
import { marquerAdresseConfirmee } from '@/lib/adresse-confirmee'

// Lien des e-mails de confirmation et de mot de passe oublié (cf.
// lib/confirmation-email, actions/mot-de-passe). Contrairement à
// /auth/callback, il fonctionne même ouvert dans un autre navigateur que
// celui de l'inscription.
//
// Ouvrir le lien (GET) ne fait qu'afficher un bouton (/auth/confirmer) :
// les filtres de messagerie d'entreprise (Microsoft Defender, Proofpoint…)
// visitent les liens avant la personne, et consommaient ce jeton à usage
// unique — elle tombait ensuite sur « lien expiré ». Le jeton n'est
// vérifié qu'au clic sur le bouton (POST).

type TypeLien = 'signup' | 'magiclink' | 'recovery'

function lireType(valeur: FormDataEntryValue | string | null): TypeLien | null {
  return valeur === 'signup' || valeur === 'magiclink' || valeur === 'recovery' ? valeur : null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = new URL('/auth/confirmer', url.origin)
  page.search = url.search
  return NextResponse.redirect(page)
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const form = await request.formData()
  const tokenHash = form.get('token_hash')
  const type = lireType(form.get('type'))
  // 303 : le navigateur suit la redirection en GET.
  const rediriger = (chemin: string) => NextResponse.redirect(`${origin}${chemin}`, 303)

  if (typeof tokenHash === 'string' && tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      // Mot de passe oublié : session ouverte, il reste à choisir le nouveau.
      if (type === 'recovery') return rediriger('/nouveau-mot-de-passe')
      if (data.user) {
        // Le lien vient du mail envoyé à cette adresse : elle est vérifiée.
        if (data.user.app_metadata?.adresse_a_confirmer) await marquerAdresseConfirmee(createAdminClient(), data.user.id)
        await envoyerBienvenueSiEnAttente(data.user.id)
      }
      return rediriger('/tableau-de-bord?adresse_confirmee=1')
    }
    if (type === 'recovery') return rediriger('/mot-de-passe-oublie?expire=1')
  }

  return rediriger('/connexion?error=auth_callback_error')
}
