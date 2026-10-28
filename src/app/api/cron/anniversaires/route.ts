import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { envoyerEmailsAnniversaires } from '@/lib/grandes-dates'
import { rappelsConfigures } from '@/lib/rappels-email'

export const runtime = 'nodejs'
export const maxDuration = 60

// Tâche planifiée quotidienne à part (voir vercel.json) : les e-mails
// d'anniversaire de couple (jour J) et de mariage (J-7) partent tôt le matin,
// 4 h UTC = 6 h à Paris l'été, 5 h l'hiver, pour être dans la boîte de
// réception au réveil (cf. src/lib/grandes-dates.ts).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!rappelsConfigures()) return NextResponse.json({ error: 'Envoi d’e-mails non configuré' }, { status: 500 })

  try {
    const anniversaires = await envoyerEmailsAnniversaires(createAdminClient())
    return NextResponse.json({ anniversaires })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
