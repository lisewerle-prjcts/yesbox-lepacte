import type { Locale } from './locale'
import type { ModuleInfo, Question } from '@/types'

/** Applique les traductions statiques `_en` d'une question si la langue active est l'anglais. */
export function localizeQuestion(q: Question, locale: Locale): Question {
  if (locale !== 'en') return q
  return {
    ...q,
    texte: q.texte_en ?? q.texte,
    hint: q.hint_en ?? q.hint,
    options: q.options_en ?? q.options,
    labelMin: q.labelMin_en ?? q.labelMin,
    labelMax: q.labelMax_en ?? q.labelMax,
  }
}

/**
 * Applique les traductions statiques `_en` d'un module (et de ses questions) si la
 * langue active est l'anglais. Les personnalisations admin (overrides, modules
 * personnalisés) n'ont qu'une variante française : en anglais, on retombe sur la
 * traduction par défaut du contenu d'origine.
 */
export function localizeModule(m: ModuleInfo, locale: Locale): ModuleInfo {
  if (locale !== 'en') return m
  return {
    ...m,
    titre: m.titre_en ?? m.titre,
    sousTitre: m.sousTitre_en ?? m.sousTitre,
    description: m.description_en ?? m.description,
    questions: m.questions.map(q => localizeQuestion(q, locale)),
  }
}

export function localizeModules(modules: ModuleInfo[], locale: Locale): ModuleInfo[] {
  return modules.map(m => localizeModule(m, locale))
}
