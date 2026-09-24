import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Si les variables Supabase manquent, laisse passer sans authentification
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  // Chemin courant transmis aux layouts serveur (le layout admin s'en sert
  // pour n'autoriser que la page Sécurité tant que la double authentification
  // n'est pas activée).
  const suivant = () => {
    const headers = new Headers(request.headers)
    headers.set('x-pathname', request.nextUrl.pathname)
    return NextResponse.next({ request: { headers } })
  }

  let supabaseResponse = suivant()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = suivant()
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes publiques accessibles sans authentification
  const publicRoutes = [
    '/', '/connexion', '/inscription', '/rejoindre',
    '/tarifs', '/mentions-legales', '/confidentialite', '/mot-de-passe-oublie', '/auth',
  ]
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  // Redirige vers /connexion si non connecté sur une route protégée
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    return NextResponse.redirect(url)
  }

  // Redirige vers /tableau-de-bord si déjà connecté sur les routes auth
  const authRoutes = ['/connexion', '/inscription']
  // Exception : /connexion?mfa=1 permet de saisir le code de double
  // authentification d'une session ouverte avec le mot de passe seul.
  const saisieCodeMfa = pathname === '/connexion' && request.nextUrl.searchParams.get('mfa') === '1'
  if (user && authRoutes.includes(pathname) && !saisieCodeMfa) {
    const url = request.nextUrl.clone()
    url.pathname = '/tableau-de-bord'
    return NextResponse.redirect(url)
  }

  // Ne pas interférer avec les routes admin — le layout admin gère lui-même la vérification is_admin
  if (pathname.startsWith('/admin')) {
    return supabaseResponse
  }

  return supabaseResponse
}
