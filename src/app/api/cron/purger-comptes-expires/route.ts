import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ajouterMois } from '@/lib/dates'
import { appliquerConservation } from '@/lib/conservation'
import { purgerCartesCadeaux } from '@/lib/cartes-cadeaux'
import { chiffrerDonneesEnClair } from '@/lib/chiffrement-migration'

export const runtime = 'nodejs'
export const maxDuration = 60

type AdminClient = ReturnType<typeof createAdminClient>

// Pré-commandes (ancien formulaire) : effacées 1 an après leur envoi.
const PRECOMMANDES_CONSERVATION_MOIS = 12

// Tâche planifiée quotidienne (voir vercel.json) appliquant les durées de
// conservation annoncées dans la politique de confidentialité :
//   1. Comptes : effacés après 24 mois d'inactivité, date recalculée chaque
//      nuit et annoncée par e-mail 2 mois, 1 mois, 1 semaine et la veille
//      (cf. src/lib/conservation.ts).
//   2. Pré-commandes (ancien formulaire) : effacées 1 an après leur envoi.
//   3. Cartes cadeaux : effacées 24 mois après la fin de leur validité.
//   4. Chiffrement des contenus encore en clair (cf. src/lib/chiffrement.ts).
export async function GET(req: Request) {
  // Refuse tout appel si CRON_SECRET n'est pas configuré : sans secret, la
  // route (qui efface des données) serait ouverte à n'importe qui.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  try {
    const { datesMisesAJour, comptesEffaces } = await appliquerConservation(admin)
    const precommandesSupprimees = await purgerPrecommandes(admin)
    const cartesCadeauxSupprimees = await purgerCartesCadeaux(admin)
    const chiffres = await chiffrerDonneesEnClair(admin)
    return NextResponse.json({ datesMisesAJour, comptesEffaces, precommandesSupprimees, cartesCadeauxSupprimees, chiffres })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

async function purgerPrecommandes(admin: AdminClient) {
  const limite = ajouterMois(new Date(), -PRECOMMANDES_CONSERVATION_MOIS)
  const { data, error } = await admin.from('precommandes').delete().lt('created_at', limite).select('id')
  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
