import { randomInt } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/server'
import { crediterReductionCouple } from '@/lib/parrainage'
import type { ResumeAvis } from '@/lib/avis-constantes'

type AdminClient = ReturnType<typeof createAdminClient>

// Avis des couples (page /avis, table avis — cf. supabase/schema.sql) :
// validés par l'équipe dans Admin > Vue d'ensemble > Tâches, puis affichés
// sur l'accueil et comptés dans la note moyenne des données structurées.
// Chaque avis publié rapporte à son auteur un code AVIS-XXXXXX : 10 €
// crédités sur le compte client Stripe du couple, comme une récompense de
// parrainage.

export * from '@/lib/avis-constantes'

export const REDUCTION_AVIS_CENTIMES = 1000

// Avis publiés, du plus récent au plus ancien. Table absente (migration pas
// encore lancée) : aucun avis, l'accueil s'affiche quand même.
export async function chargerAvisPublies(admin: AdminClient): Promise<ResumeAvis> {
  const { data, error } = await admin.from('avis')
    .select('id, prenom, debut_mois, note, texte, traite_le')
    .eq('statut', 'publie')
    .order('traite_le', { ascending: false })
  if (error || !data?.length) return { avis: [], moyenne: null, nombre: 0 }
  const avis = data.map(a => ({ id: a.id, prenom: a.prenom, debutMois: a.debut_mois, note: a.note, texte: a.texte, publieLe: a.traite_le }))
  const moyenne = Math.round(avis.reduce((s, a) => s + a.note, 0) / avis.length * 10) / 10
  return { avis, moyenne, nombre: avis.length }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I/O/0/1, faciles à confondre

export function genererCodeAvis() {
  let code = 'AVIS-'
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return code
}

export function normaliserCodeAvis(saisie: string): string | null {
  const brut = saisie.trim().toUpperCase().replace(/[\s-]/g, '')
  return /^AVIS[A-Z0-9]{6}$/.test(brut) ? `AVIS-${brut.slice(4)}` : null
}

// Code reçu pour un avis publié, saisi dans « Ajouter un code » : utilisable
// une seule fois, par le couple actuel de la personne qui a écrit l'avis
// (elle a pu rejoindre son ou sa partenaire depuis). Le code
// est marqué utilisé avant le crédit Stripe (deux saisies simultanées ne
// créditent qu'une fois), puis libéré si Stripe échoue.
export async function utiliserCodeAvis(admin: AdminClient, code: string, coupleId: string): Promise<'ok' | 'invalide' | 'deja_utilise' | 'autre_couple' | 'erreur'> {
  const { data: avis } = await admin.from('avis').select('id, code_utilise_le, profiles(couple_id)').eq('code_reduction', code).maybeSingle()
  if (!avis) return 'invalide'
  if (avis.code_utilise_le) return 'deja_utilise'
  const auteur = avis.profiles as { couple_id: string | null } | { couple_id: string | null }[] | null
  if ((Array.isArray(auteur) ? auteur[0] : auteur)?.couple_id !== coupleId) return 'autre_couple'

  const { data: pris } = await admin.from('avis')
    .update({ code_utilise_le: new Date().toISOString() })
    .eq('id', avis.id).is('code_utilise_le', null)
    .select('id')
  if (!pris?.length) return 'deja_utilise'

  try {
    await crediterReductionCouple(admin, coupleId, REDUCTION_AVIS_CENTIMES, `Avis YES BOX : ${REDUCTION_AVIS_CENTIMES / 100} € de réduction`)
    return 'ok'
  } catch (e) {
    console.error(`[avis] réduction non créditée au couple ${coupleId} : ${e instanceof Error ? e.message : String(e)}`)
    await admin.from('avis').update({ code_utilise_le: null }).eq('id', avis.id)
    return 'erreur'
  }
}
