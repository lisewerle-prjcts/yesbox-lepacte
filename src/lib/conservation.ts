import type { createAdminClient } from '@/lib/supabase/server'
import { ajouterMois, ACCES_GRATUIT_ILLIMITE_ISO } from '@/lib/dates'
import { supprimerCompte } from '@/lib/suppression-compte'

type AdminClient = ReturnType<typeof createAdminClient>

// Conservation des données : un compte est effacé (profil, réponses,
// conclusions, pacte, puis le couple quand plus personne n'y reste) après
// 24 mois d'inactivité. La date d'effacement de chaque couple
// (couples.effacement_prevu_le) est recalculée chaque nuit par
// /api/cron/purger-comptes-expires à partir de la dernière activité connue :
//   - dernière visite ou connexion d'un membre (profiles.derniere_visite_le,
//     posée par le proxy via marquer_visite, et last_sign_in_at) ;
//   - dernière réponse ou conclusion enregistrée (couples.derniere_activite_le) ;
//   - fin de l'accès payé ou gratuit (un couple qui paie n'est jamais inactif).
// Les avertissements partent 2 mois, 1 mois, 1 semaine et la veille
// (cf. envoyerAvertissementsEffacement dans src/lib/rappels-email.ts).
// Doit rester identique à l'intervalle de marquer_visite (supabase/schema.sql).
export const INACTIVITE_MOIS = 24

// Une date d'effacement n'est jamais fixée à moins de 61 jours de son premier
// calcul : les quatre avertissements ont toujours le temps de partir (y
// compris pour les comptes déjà inactifs depuis plus de 24 mois à la mise en
// place de la règle).
const PREAVIS_MIN_JOURS = 61
const JOUR = 24 * 60 * 60 * 1000

interface Membre { id: string; couple_id: string | null; is_admin: boolean | null; derniere_visite_le?: string | null }

function plusTard(...dates: (string | null | undefined)[]): number {
  return dates.reduce<number>((max, d) => (d ? Math.max(max, new Date(d).getTime()) : max), 0)
}

async function lireMembres(admin: AdminClient): Promise<Membre[]> {
  const membres: Membre[] = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await admin.from('profiles').select('id, couple_id, is_admin, derniere_visite_le').range(debut, debut + 999)
    if (error) throw new Error(error.message)
    membres.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return membres
}

async function lireConnexions(admin: AdminClient): Promise<Map<string, number>> {
  const connexions = new Map<string, number>()
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) connexions.set(u.id, plusTard(u.last_sign_in_at, u.created_at))
    if (data.users.length < 1000) break
  }
  return connexions
}

// Recalcule la date d'effacement de chaque couple, puis efface les comptes
// dont la date est passée. Renvoie le nombre de comptes (personnes) effacés.
export async function appliquerConservation(admin: AdminClient): Promise<{ datesMisesAJour: number; comptesEffaces: number }> {
  const maintenant = Date.now()
  const [membres, connexions] = await Promise.all([lireMembres(admin), lireConnexions(admin)])

  const activiteMembre = (m: Membre) => Math.max(connexions.get(m.id) ?? 0, plusTard(m.derniere_visite_le))
  const parCouple = new Map<string, Membre[]>()
  const sansCouple: Membre[] = []
  for (const m of membres) {
    if (m.couple_id) parCouple.set(m.couple_id, [...(parCouple.get(m.couple_id) ?? []), m])
    else sansCouple.push(m)
  }

  let datesMisesAJour = 0
  const aEffacer: string[] = []
  const couplesVides: string[] = []

  for (let debut = 0; ; debut += 1000) {
    const { data: couples, error } = await admin
      .from('couples')
      .select('id, created_at, derniere_activite_le, subscription_current_period_end, acces_gratuit_expire_le, effacement_prevu_le')
      .range(debut, debut + 999)
    if (error) throw new Error(error.message)

    for (const c of couples ?? []) {
      const membresCouple = parCouple.get(c.id) ?? []
      // Les comptes d'administration ne sont jamais effacés automatiquement.
      if (membresCouple.some(m => m.is_admin)) {
        if (c.effacement_prevu_le) {
          await admin.from('couples').update({ effacement_prevu_le: null }).eq('id', c.id)
          datesMisesAJour++
        }
        continue
      }

      const accesGratuit = c.acces_gratuit_expire_le === ACCES_GRATUIT_ILLIMITE_ISO ? null : c.acces_gratuit_expire_le
      const derniereActivite = Math.max(
        plusTard(c.created_at, c.derniere_activite_le, c.subscription_current_period_end, accesGratuit),
        ...membresCouple.map(activiteMembre),
      )
      const cible = new Date(ajouterMois(new Date(derniereActivite), INACTIVITE_MOIS)).getTime()
      const plancher = c.effacement_prevu_le ? new Date(c.effacement_prevu_le).getTime() : maintenant + PREAVIS_MIN_JOURS * JOUR
      const effacementLe = Math.max(cible, plancher)

      if (effacementLe <= maintenant) {
        if (membresCouple.length) aEffacer.push(...membresCouple.map(m => m.id))
        else couplesVides.push(c.id)
        continue
      }
      const nouvelleDate = new Date(effacementLe).toISOString()
      if (nouvelleDate !== (c.effacement_prevu_le && new Date(c.effacement_prevu_le).toISOString())) {
        const { error: majError } = await admin.from('couples').update({ effacement_prevu_le: nouvelleDate }).eq('id', c.id)
        if (majError) throw new Error(majError.message)
        datesMisesAJour++
      }
    }
    if (!couples || couples.length < 1000) break
  }

  // Personnes sans couple (cas rare) : effacées après 24 mois sans visite.
  const limite = new Date(ajouterMois(new Date(maintenant), -INACTIVITE_MOIS)).getTime()
  for (const m of sansCouple) {
    if (!m.is_admin && activiteMembre(m) < limite) aEffacer.push(m.id)
  }

  let comptesEffaces = 0
  for (const userId of aEffacer) {
    const { error } = await supprimerCompte(admin, userId)
    if (error) console.error(`[conservation] effacement du compte ${userId} : ${error}`)
    else comptesEffaces++
  }
  if (couplesVides.length) await admin.from('couples').delete().in('id', couplesVides)

  return { datesMisesAJour, comptesEffaces }
}
