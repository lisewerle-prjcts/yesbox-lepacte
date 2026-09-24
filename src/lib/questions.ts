import type { Question } from '@/types'

/**
 * Réponse à une question de type "grille" : un objet JSON { indexLigne: indexColonne },
 * sérialisé en chaîne pour être stocké comme les autres réponses.
 */
export function parseGrille(val: string | null | undefined): Record<number, number> {
  if (!val) return {}
  try {
    const raw = JSON.parse(val)
    if (!raw || typeof raw !== 'object') return {}
    const result: Record<number, number> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number') result[Number(k)] = v
    }
    return result
  } catch {
    return {}
  }
}

export function serializeGrille(grille: Record<number, number>): string {
  return JSON.stringify(grille)
}

/** Une question est répondue quand sa valeur est non vide ; une grille, quand chaque ligne est cochée. */
export function isQuestionAnswered(q: Question, val: string | null | undefined): boolean {
  if (val === undefined || val === null || val === '') return false
  if (q.type === 'grille') {
    const grille = parseGrille(val)
    return (q.lignes ?? []).every((_, i) => grille[i] !== undefined)
  }
  return true
}

/** Version texte d'une grille ("Les courses : Moi ; La vaisselle : Nous deux…"). */
export function formatGrille(q: Question, val: string): string {
  const grille = parseGrille(val)
  return (q.lignes ?? [])
    .map((ligne, i) => grille[i] !== undefined ? `${ligne} : ${q.options?.[grille[i]] ?? '?'}` : null)
    .filter(Boolean)
    .join(' ; ')
}

/**
 * Vrai quand toutes les questions actuelles du module ont une réponse valide.
 * On ne compte que les questions en cours : des réponses à d'anciennes questions
 * (retirées depuis) ne doivent pas faire croire qu'un module est terminé.
 */
export function hasAnsweredAll(questions: Question[], reponses: { question_slug: string; valeur: string | null }[]): boolean {
  const map: Record<string, string> = {}
  reponses.forEach(r => { if (r.valeur) map[r.question_slug] = r.valeur })
  return questions.every(q => isQuestionAnswered(q, map[q.slug]))
}

/** Réponse lisible (choix → libellé, échelle → "x / max", grille → résumé texte). */
export function formatAnswer(q: Question, val: string | null | undefined): string | null {
  if (val === undefined || val === null || val === '') return null
  if (q.type === 'choix' && q.options) return q.options[parseInt(val)] ?? val
  if (q.type === 'choix_multiple' && q.options) {
    return val.split('||').map(i => q.options![parseInt(i)]).filter(Boolean).join(', ') || val
  }
  if (q.type === 'echelle') return `${val} / ${q.max ?? 10}`
  if (q.type === 'grille') return formatGrille(q, val)
  return val
}

/**
 * Libellé de la colonne cochée, vu depuis la personne qui a répondu. Avec
 * `colonnesMoiToi`, "Moi" devient le prénom de cette personne et "Toi" celui de l'autre.
 */
export function libelleColonne(q: Question, colonne: number, auteur: string, autre: string): string {
  if (q.colonnesMoiToi && colonne === 0) return auteur
  if (q.colonnesMoiToi && colonne === 1) return autre
  return q.options?.[colonne] ?? '?'
}

/**
 * Clé comparable entre les deux réponses : avec `colonnesMoiToi`, "Moi" chez l'un·e
 * équivaut à "Toi" chez l'autre.
 */
export function cleColonne(q: Question, colonne: number, estPremierePersonne: boolean): string {
  if (q.colonnesMoiToi && (colonne === 0 || colonne === 1)) {
    const designePremiere = (colonne === 0) === estPremierePersonne
    return designePremiere ? 'p1' : 'p2'
  }
  return `c${colonne}`
}
