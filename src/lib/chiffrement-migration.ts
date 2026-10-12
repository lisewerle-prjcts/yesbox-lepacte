import type { createAdminClient } from '@/lib/supabase/server'
import { chiffrer, chiffrementActif } from '@/lib/chiffrement'

type AdminClient = ReturnType<typeof createAdminClient>

const PAR_LOT = 500
const LOTS_MAX = 40

// Chiffre les contenus encore en clair (enregistrés avant la mise en place
// du chiffrement, ou pendant que la clé manquait). Appelée chaque nuit par
// la tâche planifiée /api/cron/purger-comptes-expires ; idempotente.
// Chaque mise à jour vérifie que la valeur n'a pas changé entre-temps, pour
// ne jamais écraser une réponse modifiée par le couple pendant la migration.
export async function chiffrerDonneesEnClair(admin: AdminClient) {
  const resultat = { reponses: 0, journal: 0, pactes: 0 }
  if (!chiffrementActif()) return { ...resultat, ignore: 'clé de chiffrement absente' }

  for (const table of ['reponses', 'journal_entries'] as const) {
    for (let lot = 0; lot < LOTS_MAX; lot++) {
      const { data, error } = await admin.from(table).select('id, valeur')
        .not('valeur', 'is', null).neq('valeur', '').not('valeur', 'like', 'enc:v1:%')
        .limit(PAR_LOT)
      if (error) throw new Error(`${table} : ${error.message}`)
      if (!data?.length) break
      for (const ligne of data) {
        const { error: majError } = await admin.from(table)
          .update({ valeur: chiffrer(ligne.valeur as string) })
          .eq('id', ligne.id).eq('valeur', ligne.valeur)
        if (majError) throw new Error(`${table} : ${majError.message}`)
        if (table === 'reponses') resultat.reponses++
        else resultat.journal++
      }
      if (data.length < PAR_LOT) break
    }
  }

  for (let lot = 0; lot < LOTS_MAX; lot++) {
    const { data, error } = await admin.from('couples').select('id, pacte_texte')
      .not('pacte_texte', 'is', null).neq('pacte_texte', '').not('pacte_texte', 'like', 'enc:v1:%')
      .limit(PAR_LOT)
    if (error) throw new Error(`couples : ${error.message}`)
    if (!data?.length) break
    for (const couple of data) {
      const { error: majError } = await admin.from('couples')
        .update({ pacte_texte: chiffrer(couple.pacte_texte as string) })
        .eq('id', couple.id).eq('pacte_texte', couple.pacte_texte)
      if (majError) throw new Error(`couples : ${majError.message}`)
      resultat.pactes++
    }
    if (data.length < PAR_LOT) break
  }
  return resultat
}
