import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifierSignatureDesinscription } from '@/lib/desinscription'

// Désinscription en un clic depuis la messagerie (en-tête List-Unsubscribe,
// RFC 8058) : la messagerie envoie un POST, sans cookie. Contrairement au
// lien en bas de l'e-mail, pas de bouton à confirmer : seule la messagerie
// envoie ce POST, à la demande de la personne.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('u') ?? ''
  if (!verifierSignatureDesinscription(userId, searchParams.get('s') ?? '')) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
  }
  const { error } = await createAdminClient().from('profiles').update({ rappels_email: false }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Ouvert dans un navigateur : la page avec le bouton de confirmation.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = new URL('/desinscription', url.origin)
  page.search = url.search
  return NextResponse.redirect(page)
}
