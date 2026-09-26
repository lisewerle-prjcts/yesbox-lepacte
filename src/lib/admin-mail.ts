import { createClient } from '@/lib/supabase/server'
import { envoyerMail } from '@/lib/mailer'

// Niveau de double authentification de la session admin :
//   - 'ok'           : code saisi (aal2) ;
//   - 'code_requis'  : double authentification activée mais code pas encore
//                      saisi dans cette session (mot de passe seul) ;
//   - 'non_activee'  : aucune double authentification sur le compte.
export type EtatMfaAdmin = 'ok' | 'code_requis' | 'non_activee'

export async function etatMfaAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<EtatMfaAdmin> {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel === 'aal2') return 'ok'
  if (aal?.nextLevel === 'aal2') return 'code_requis'
  return 'non_activee'
}

// Toute action admin exige un compte admin ET une session validée par la
// double authentification. `sansMfaActivee` n'est utilisé que par les
// actions nécessaires pour l'activer (page Sécurité) : il tolère un compte
// qui n'a pas encore de double authentification, jamais une session dont le
// code n'a pas été saisi.
export async function assertAdmin({ sansMfaActivee = false }: { sansMfaActivee?: boolean } = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Accès refusé')

  const mfa = await etatMfaAdmin(supabase)
  if (mfa === 'code_requis') throw new Error('Code de double authentification requis')
  if (mfa === 'non_activee' && !sansMfaActivee) throw new Error('Active la double authentification (Admin > Sécurité) pour utiliser l\'espace admin')
  return supabase
}

export async function notifySecurityEvent(recipientEmail: string | null, subject: string, bodyText: string) {
  if (!recipientEmail) return
  await envoyerMail({
    nom: 'YES BOX Sécurité',
    to: recipientEmail,
    subject,
    body: `<p>${bodyText}</p><p style="font-size:12px;color:#736c63;">${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</p>`,
  })
}
