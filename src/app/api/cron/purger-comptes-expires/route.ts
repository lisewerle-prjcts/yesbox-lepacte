import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Tâche planifiée (voir vercel.json) : clôture définitivement les comptes
// dont les 13 mois de conservation des données (data_retention_until) sont
// écoulés depuis la fin de l'accès payé. Au-delà, l'abonnement ne peut plus
// être réactivé sur ce couple (cf. demarrerAbonnement) : les réponses et le
// journal sont effacés, et il faut recommencer avec un nouveau compte.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: couples, error } = await admin
    .from('couples')
    .select('id')
    .is('compte_resilie_le', null)
    .not('data_retention_until', 'is', null)
    .lte('data_retention_until', nowIso)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!couples?.length) return NextResponse.json({ resilies: 0 })

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

  return NextResponse.json({ resilies: coupleIds.length })
}
