import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { RETENTION_MOIS } from '@/lib/stripe'
import { ajouterMois } from '@/lib/dates'
import { supprimerCompte } from '@/lib/suppression-compte'

export const runtime = 'nodejs'

type AdminClient = ReturnType<typeof createAdminClient>

// Tâche planifiée quotidienne (voir vercel.json) appliquant les durées de
// conservation annoncées dans la politique de confidentialité (18 mois) :
//   1. Comptes payants : 18 mois après la fin de l'accès payé
//      (data_retention_until), le compte est clos définitivement — réponses,
//      journal et pacte effacés, abonnement non réactivable.
//   2. Comptes jamais payés (gratuits ou jamais utilisés) : supprimés
//      entièrement quand aucun membre ne s'est connecté depuis 18 mois.
//   3. Pré-commandes (ancien formulaire) : effacées 18 mois après leur envoi.
export async function GET(req: Request) {
  // Refuse tout appel si CRON_SECRET n'est pas configuré : sans secret, la
  // route (qui efface des données) serait ouverte à n'importe qui.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  try {
    const resilies = await cloreComptesPayantsExpires(admin)
    const inactifsSupprimes = await supprimerComptesGratuitsInactifs(admin)
    const precommandesSupprimees = await purgerPrecommandes(admin)
    return NextResponse.json({ resilies, inactifsSupprimes, precommandesSupprimees })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

async function cloreComptesPayantsExpires(admin: AdminClient) {
  const nowIso = new Date().toISOString()
  const { data: couples, error } = await admin
    .from('couples')
    .select('id')
    .is('compte_resilie_le', null)
    .not('data_retention_until', 'is', null)
    .lte('data_retention_until', nowIso)

  if (error) throw new Error(error.message)
  if (!couples?.length) return 0

  const coupleIds = couples.map(c => c.id)

  await admin.from('reponses').delete().in('module_id',
    (await admin.from('modules').select('id').in('couple_id', coupleIds)).data?.map(m => m.id) ?? []
  )
  await admin.from('journal_entries').delete().in('couple_id', coupleIds)
  await admin.from('modules').update({ statut: 'locked', revealed: false, revealed_at: null, completed_at: null }).in('couple_id', coupleIds)
  await admin.from('couples').update({
    pacte_texte: null,
    subscription_status: 'resilie',
    compte_resilie_le: nowIso,
  }).in('id', coupleIds)

  return coupleIds.length
}

async function supprimerComptesGratuitsInactifs(admin: AdminClient) {
  const limite = new Date(ajouterMois(new Date(), -RETENTION_MOIS)).getTime()

  // Dernière activité connue de chaque compte : dernière connexion, ou
  // création du compte s'il ne s'est jamais connecté.
  const derniereActivite = new Map<string, number>()
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) {
      derniereActivite.set(u.id, new Date(u.last_sign_in_at ?? u.created_at).getTime())
    }
    if (data.users.length < 1000) break
  }

  const { data: profiles, error } = await admin.from('profiles').select('id, couple_id, is_admin')
  if (error) throw new Error(error.message)

  const parCouple = new Map<string, { id: string; is_admin: boolean | null }[]>()
  const sansCouple: { id: string; is_admin: boolean | null }[] = []
  for (const p of profiles ?? []) {
    if (p.couple_id) parCouple.set(p.couple_id, [...(parCouple.get(p.couple_id) ?? []), p])
    else sansCouple.push(p)
  }

  const inactif = (m: { id: string; is_admin: boolean | null }) =>
    !m.is_admin && (derniereActivite.get(m.id) ?? Date.now()) < limite

  // Couples qui n'ont jamais payé : un couple déjà abonné relève de la règle
  // de clôture ci-dessus, et un accès gratuit en cours est préservé.
  const coupleIds = [...parCouple.keys()]
  const jamaisPayes = new Set<string>()
  for (let i = 0; i < coupleIds.length; i += 200) {
    const { data, error: coupleError } = await admin
      .from('couples')
      .select('id, stripe_subscription_id, acces_gratuit_expire_le')
      .in('id', coupleIds.slice(i, i + 200))
    if (coupleError) throw new Error(coupleError.message)
    for (const c of data ?? []) {
      const accesGratuitEnCours = c.acces_gratuit_expire_le && new Date(c.acces_gratuit_expire_le).getTime() > Date.now()
      if (!c.stripe_subscription_id && !accesGratuitEnCours) jamaisPayes.add(c.id)
    }
  }

  const aSupprimer: string[] = sansCouple.filter(inactif).map(p => p.id)
  for (const [coupleId, membres] of parCouple) {
    if (jamaisPayes.has(coupleId) && membres.every(inactif)) aSupprimer.push(...membres.map(m => m.id))
  }

  let supprimes = 0
  for (const userId of aSupprimer) {
    const { error: suppressionError } = await supprimerCompte(admin, userId)
    if (!suppressionError) supprimes++
  }
  return supprimes
}

async function purgerPrecommandes(admin: AdminClient) {
  const limite = ajouterMois(new Date(), -RETENTION_MOIS)
  const { data, error } = await admin.from('precommandes').delete().lt('created_at', limite).select('id')
  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
