import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { envoyerAlertesGrandesDates, envoyerRappelsValidation } from '@/lib/grandes-dates'
import { envoyerRelancesInactivite, envoyerRelancesDemarrage, envoyerRappelsMensuels, envoyerEmailsFetes, envoyerPropositionsAnnuel, envoyerAnnoncesRenouvellement, envoyerPropositionsRdvAnnuel, envoyerAvertissementsEffacement, envoyerDemandesAvis, envoyerEmailsParrainage, rappelsConfigures } from '@/lib/rappels-email'

export const runtime = 'nodejs'
export const maxDuration = 60

// Tâche planifiée quotidienne (voir vercel.json) : relances après 10 jours
// sans avancer, relances des couples pas encore au complet ou qui n'ont
// jamais commencé (3 puis 10 jours), e-mails mensuels, des fêtes de fin d'année et de la Saint-Valentin une fois
// le pacte signé et proposition de
// l'abonnement annuel 5 jours avant la fin du mois, annonce du
// renouvellement à 19 €/an un mois avant, proposition de l'abonnement annuel
// 2 mois avant le rendez-vous annuel, demande d'avis 2 jours après la fin
// du premier module et du pacte, code de parrainage après le module 5,
// avertissements avant
// l'effacement des données (cf. src/lib/rappels-email.ts) ; alerte à
// l'équipe un mois avant les grandes dates des couples, rappel à l'équipe si
// les e-mails d'anniversaire ne sont pas validés 3 jours avant
// (src/lib/grandes-dates.ts). Les e-mails d'anniversaire eux-mêmes partent
// plus tôt, par /api/cron/anniversaires.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!rappelsConfigures()) return NextResponse.json({ error: 'Envoi d’e-mails non configuré' }, { status: 500 })

  const admin = createAdminClient()
  try {
    const relances = await envoyerRelancesInactivite(admin)
    const relancesDemarrage = await envoyerRelancesDemarrage(admin)
    const mensuels = await envoyerRappelsMensuels(admin)
    const fetes = await envoyerEmailsFetes(admin)
    const propositionsAnnuel = await envoyerPropositionsAnnuel(admin)
    const annoncesRenouvellement = await envoyerAnnoncesRenouvellement(admin)
    const propositionsRdvAnnuel = await envoyerPropositionsRdvAnnuel(admin)
    const avertissementsEffacement = await envoyerAvertissementsEffacement(admin)
    const demandesAvis = await envoyerDemandesAvis(admin)
    const parrainage = await envoyerEmailsParrainage(admin)
    const alertesGrandesDates = await envoyerAlertesGrandesDates(admin)
    const rappelsValidation = await envoyerRappelsValidation(admin)
    return NextResponse.json({ relances, relancesDemarrage, mensuels, fetes, propositionsAnnuel, annoncesRenouvellement, propositionsRdvAnnuel, avertissementsEffacement, demandesAvis, parrainage, alertesGrandesDates, rappelsValidation })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
