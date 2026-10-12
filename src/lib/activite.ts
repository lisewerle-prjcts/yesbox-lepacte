import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

// Le couple vient d'avancer (réponse ou conclusion enregistrée) : la relance
// après 10 jours d'inactivité repart de zéro (cf. src/lib/rappels-email.ts).
// N'échoue jamais : un suivi manqué ne doit pas bloquer l'enregistrement.
export async function marquerActivite(admin: AdminClient, coupleId: string): Promise<void> {
  try {
    await admin.from('couples').update({ derniere_activite_le: new Date().toISOString(), relances_inactivite: 0 }).eq('id', coupleId)
  } catch (e) {
    console.error(`[activite] ${e instanceof Error ? e.message : String(e)}`)
  }
}
