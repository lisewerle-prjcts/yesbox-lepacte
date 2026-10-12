'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { verifierSignatureDesinscription } from '@/lib/rappels-email'

// Mon compte : accepter ou refuser les e-mails de rappel YES BOX.
export async function changerRappelsEmail(actif: boolean) {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { error } = await createAdminClient().from('profiles').update({ rappels_email: actif }).eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  return { success: true }
}

// Lien en bas des e-mails : désinscription sans être connecté·e, vérifiée
// par la signature du lien. Confirmée par un bouton (et non à l'ouverture
// du lien) pour qu'un antivirus qui visite les liens ne désinscrive pas.
export async function seDesinscrireDesRappels(userId: string, signature: string) {
  if (!verifierSignatureDesinscription(userId, signature)) return { error: 'Lien invalide ou expiré.' }
  const { error } = await createAdminClient().from('profiles').update({ rappels_email: false }).eq('id', userId)
  if (error) return { error: error.message }
  return { success: true }
}
