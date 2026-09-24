import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Les routes /api/* (webhook Stripe, tâche planifiée) se protègent elles-mêmes
    // (signature Stripe, secret de cron) et ne doivent jamais être redirigées vers
    // /connexion faute de cookie de session — elles n'en ont jamais.
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
