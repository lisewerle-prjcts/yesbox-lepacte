import type { User } from '@supabase/supabase-js'
import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

// On entre dans son espace dès l'inscription, sans attendre le lien du mail
// de confirmation : un mail perdu (spams, fournisseur strict, adresse mal
// tapée) bloquait la personne à la porte. Pour Supabase, le compte est donc
// confirmé tout de suite ; c'est la marque `adresse_a_confirmer` (app_metadata,
// modifiable seulement côté serveur) qui dit si l'adresse a vraiment été
// vérifiée. Les comptes plus anciens n'ont pas cette marque : seul compte
// alors email_confirmed_at.
export function adresseConfirmee(user: Pick<User, 'email_confirmed_at' | 'app_metadata'>) {
  return !!user.email_confirmed_at && user.app_metadata?.adresse_a_confirmer !== true
}

// Ouvre l'accès sans que l'adresse soit vérifiée : le bandeau du tableau de
// bord demandera de cliquer sur le lien du mail.
export async function ouvrirAccesSansConfirmation(admin: AdminClient, userId: string) {
  return admin.auth.admin.updateUserById(userId, { email_confirm: true, app_metadata: { adresse_a_confirmer: true } })
}

// Lien du mail ouvert, ou confirmation à la main depuis l'admin.
export async function marquerAdresseConfirmee(admin: AdminClient, userId: string) {
  return admin.auth.admin.updateUserById(userId, { email_confirm: true, app_metadata: { adresse_a_confirmer: false } })
}
