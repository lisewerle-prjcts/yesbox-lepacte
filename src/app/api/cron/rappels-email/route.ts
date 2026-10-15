import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { envoyerRelancesInactivite, envoyerRappelsMensuels, envoyerPropositionsAnnuel, rappelsConfigures } from '@/lib/rappels-email'

export const runtime = 'nodejs'
export const maxDuration = 60

// Tâche planifiée quotidienne (voir vercel.json) : relances après 10 jours
// sans avancer, e-mails mensuels une fois le pacte signé et proposition de
// l'abonnement annuel 5 jours avant la fin du mois (cf. src/lib/rappels-email.ts).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!rappelsConfigures()) return NextResponse.json({ error: 'Envoi d’e-mails non configuré' }, { status: 500 })

  const admin = createAdminClient()
  try {
    const relances = await envoyerRelancesInactivite(admin)
    const mensuels = await envoyerRappelsMensuels(admin)
    const propositionsAnnuel = await envoyerPropositionsAnnuel(admin)
    return NextResponse.json({ relances, mensuels, propositionsAnnuel })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
