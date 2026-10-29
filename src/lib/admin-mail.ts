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

function echapper(texte: string) {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Prévient l'équipe à chaque nouvelle inscription. Ne bloque jamais
// l'inscription : une erreur d'envoi est simplement ignorée.
export async function notifierNouvelleInscription(infos: { prenom: string; email: string; parcours: string }) {
  const destinataire = process.env.ADMIN_NOTIF_EMAIL || 'lise.yesbox@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })
  await envoyerMail({
    nom: 'YES BOX Inscriptions',
    to: destinataire,
    subject: `Nouvelle inscription : ${infos.prenom.replace(/[\r\n]+/g, ' ')}`,
    body: `
      <p>Une nouvelle personne vient de s'inscrire sur YES BOX.</p>
      <p><strong>Prénom :</strong> ${echapper(infos.prenom)}<br><strong>E-mail :</strong> ${echapper(infos.email)}<br><strong>Parcours :</strong> ${echapper(infos.parcours)}<br><strong>Date :</strong> ${date}</p>
      <p><a href="${appUrl}/admin/utilisateurs">Voir les utilisateurs dans l'admin</a></p>
    `,
  }).catch(() => false)
}

// Prévient l'équipe à chaque avis laissé sur /avis, à valider dans
// Vue d'ensemble > Tâches. Ne bloque jamais l'envoi de l'avis.
export async function notifierNouvelAvis(infos: { prenom: string; email: string | null; note: number; texte: string; debutMois: string }) {
  const destinataire = process.env.ADMIN_NOTIF_EMAIL || 'lise.yesbox@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
  const etoiles = '★'.repeat(infos.note) + '☆'.repeat(5 - infos.note)
  await envoyerMail({
    nom: 'YES BOX Avis',
    to: destinataire,
    subject: `Nouvel avis à valider : ${infos.note}/5 de ${infos.prenom.replace(/[\r\n]+/g, ' ')}`,
    body: `
      <p>Un nouvel avis attend ta validation.</p>
      <p><strong>Prénom ou initiales :</strong> ${echapper(infos.prenom)}<br><strong>E-mail :</strong> ${echapper(infos.email ?? '—')}<br><strong>A commencé la YES BOX :</strong> ${echapper(infos.debutMois)}<br><strong>Note :</strong> ${etoiles} (${infos.note}/5)</p>
      <blockquote style="border-left:3px solid #c5256e;margin:0;padding:4px 12px;font-style:italic;white-space:pre-line;">${echapper(infos.texte)}</blockquote>
      <p><a href="${appUrl}/admin#taches">Valider ou refuser l'avis dans l'admin</a></p>
    `,
  }).catch(() => false)
}
