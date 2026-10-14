import type { ConclusionTexte, Question } from '@/types'

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

/**
 * Réponse à une question "choix_multiple" : les index des cases cochées et,
 * si la question a un champ "autre", le texte libre. Stockée en JSON quand il y
 * a un texte libre, sinon sous l'ancienne forme "0||2". Une ancienne réponse en
 * texte libre (question passée de "text" à "choix_multiple") est reprise comme
 * texte "autre".
 */
export interface ChoixMultiple { choix: number[]; autre: string }

export function parseChoixMultiple(val: string | null | undefined): ChoixMultiple {
  if (!val) return { choix: [], autre: '' }
  if (val.startsWith('{')) {
    try {
      const raw = JSON.parse(val)
      return {
        choix: Array.isArray(raw?.choix) ? raw.choix.filter((n: unknown) => typeof n === 'number') : [],
        autre: typeof raw?.autre === 'string' ? raw.autre : '',
      }
    } catch { /* texte libre commençant par "{" */ }
  }
  if (/^\d+(\|\|\d+)*$/.test(val)) return { choix: val.split('||').map(Number), autre: '' }
  return { choix: [], autre: val }
}

export function serializeChoixMultiple({ choix, autre }: ChoixMultiple): string {
  if (autre) return JSON.stringify({ choix, autre })
  return choix.join('||')
}

/** Une question est répondue quand sa valeur est non vide ; une grille, quand chaque ligne est cochée. */
export function isQuestionAnswered(q: Question, val: string | null | undefined): boolean {
  if (val === undefined || val === null || val === '') return false
  if (q.type === 'grille') {
    const grille = parseGrille(val)
    return (q.lignes ?? []).every((_, i) => grille[i] !== undefined)
  }
  if (q.type === 'choix_multiple') {
    const { choix, autre } = parseChoixMultiple(val)
    return choix.length > 0 || autre.trim() !== ''
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
    const { choix, autre } = parseChoixMultiple(val)
    const libelles = choix.map(i => q.options![i]).filter(Boolean)
    if (autre.trim()) libelles.push(autre.trim())
    return libelles.join(', ') || null
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

/** Une réponse de conclusion est complète : texte non vide, ou au moins une case / le champ « autre » rempli. */
export function isConclusionAnswered(c: ConclusionTexte, val: string | null | undefined): boolean {
  if (!c.options) return !!val?.trim()
  const { choix, autre } = parseChoixMultiple(val)
  return choix.length > 0 || autre.trim() !== ''
}

/** Réponse de conclusion lisible : avec des cases à cocher, la liste des libellés cochés. */
export function formatConclusion(c: ConclusionTexte, val: string | null | undefined): string {
  if (!val) return ''
  if (!c.options) return val
  const { choix, autre } = parseChoixMultiple(val)
  const libelles = choix.map(i => c.options![i]).filter(Boolean)
  if (autre.trim()) libelles.push(autre.trim())
  return libelles.join(', ')
}
