import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

/**
 * Cookie posé par un admin pour « voir / tester en tant que » un membre d'un
 * couple. Sa présence n'est honorée que si le compte réellement connecté a
 * is_admin = true (revérifié à chaque appel via le client service role).
 */
export const ADMIN_VIEW_AS_COOKIE = 'admin_view_as'

export interface EffectiveSession {
  /** Client à utiliser pour lire/écrire les données de cette session.
   * Client service role (bypass RLS) si un admin usurpe un membre,
   * sinon le client normal scoping RLS de l'utilisateur connecté. */
  db: SupabaseClient
  userId: string
  profile: Profile
  isImpersonating: boolean
  adminProfile: Profile | null
}

export async function getEffectiveSession(): Promise<EffectiveSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  const viewAsId = cookieStore.get(ADMIN_VIEW_AS_COOKIE)?.value

  if (viewAsId && viewAsId !== user.id) {
    const admin = createAdminClient()
    const { data: adminProfile } = await admin.from('profiles').select('*').eq('id', user.id).single()
    if (adminProfile?.is_admin) {
      const { data: targetProfile } = await admin.from('profiles').select('*').eq('id', viewAsId).single()
      if (targetProfile) {
        return {
          db: admin,
          userId: targetProfile.id,
          profile: targetProfile as Profile,
          isImpersonating: true,
          adminProfile: adminProfile as Profile,
        }
      }
    }
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return null
  return { db: supabase, userId: user.id, profile: profile as Profile, isImpersonating: false, adminProfile: null }
}
