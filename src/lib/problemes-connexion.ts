import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

// Encart « Problèmes de connexion et d'e-mails » de la vue d'ensemble admin :
// comptes jamais confirmés, connexions bloquées après trop d'essais,
// e-mails qui n'ont pas pu partir.

export interface CompteNonConfirme { id: string; email: string; prenom: string | null; inscritLe: string }
export interface Blocage { cle: string; libelle: string; jusqua: string }
export interface EchecEmail { destinataire: string; sujet: string; erreur: string | null; date: string }

const NON_CONFIRME_APRES_HEURES = 24
const ECHECS_SUR_JOURS = 30

export async function chargerProblemesConnexion(admin: AdminClient) {
  const maintenant = Date.now()
  const [{ data: auth }, { data: profils }, { data: verrous }, { data: echecs }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('profiles').select('id, email, prenom'),
    admin.from('login_attempts').select('email, locked_until').gt('locked_until', new Date(maintenant).toISOString()),
    // Table absente : data null, l'encart reste affiché.
    admin.from('emails_envoyes').select('destinataire, sujet, erreur, envoye_le').eq('ok', false)
      .gte('envoye_le', new Date(maintenant - ECHECS_SUR_JOURS * 24 * 60 * 60_000).toISOString())
      .order('envoye_le', { ascending: false }).limit(50),
  ])
  const profilParId = new Map((profils ?? []).map(p => [p.id, p]))

  const nonConfirmes: CompteNonConfirme[] = (auth?.users ?? [])
    .filter(u => !u.email_confirmed_at && maintenant - new Date(u.created_at).getTime() > NON_CONFIRME_APRES_HEURES * 60 * 60_000)
    .map(u => ({ id: u.id, email: u.email ?? profilParId.get(u.id)?.email ?? '—', prenom: profilParId.get(u.id)?.prenom ?? null, inscritLe: u.created_at }))
    .sort((a, b) => b.inscritLe.localeCompare(a.inscritLe))

  // login_attempts : la clé est l'adresse e-mail (connexion) ou
  // « code-couple:<id> » (essais de code couple).
  const bloques: Blocage[] = (verrous ?? []).map(v => {
    const code = v.email.match(/^code-couple:(.+)$/)
    const libelle = code
      ? `Saisie du code couple — ${profilParId.get(code[1])?.email ?? 'compte inconnu'}`
      : `Connexion — ${v.email}`
    return { cle: v.email, libelle, jusqua: v.locked_until as string }
  })

  return {
    nonConfirmes,
    bloques,
    echecs: (echecs ?? []).map(e => ({ destinataire: e.destinataire, sujet: e.sujet, erreur: e.erreur, date: e.envoye_le })) as EchecEmail[],
  }
}
