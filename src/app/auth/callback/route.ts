import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // N'accepte qu'un chemin interne : sans ce contrôle, ?next=@site-externe.com
  // redirigeait vers un autre site après la connexion.
  const nextParam = searchParams.get('next')
  const next = nextParam && /^\/(?![\/\\])/.test(nextParam) ? nextParam : '/tableau-de-bord'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_error`)
}
