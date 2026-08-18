import { createAdminClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import type { ModuleInfo, Question } from '@/types'

export const OVERRIDE_KEY_PREFIX = 'module_questions_override::'

export type QuestionOverride = Partial<Pick<Question, 'texte' | 'hint' | 'options' | 'labelMin' | 'labelMax'>>

export interface ModuleContentOverrides {
  overrides: Record<string, QuestionOverride> // question_slug -> édition d'une question existante
  hidden: string[]                             // question_slug de questions de base retirées
  custom: Question[]                           // questions ajoutées de toutes pièces
}

export function emptyOverrides(): ModuleContentOverrides {
  return { overrides: {}, hidden: [], custom: [] }
}

// Accepte aussi l'ancien format à plat { [questionSlug]: QuestionOverride }
export function normalizeOverrides(raw: unknown): ModuleContentOverrides {
  if (!raw || typeof raw !== 'object') return emptyOverrides()
  const r = raw as Record<string, unknown>
  if ('overrides' in r || 'hidden' in r || 'custom' in r) {
    return {
      overrides: (r.overrides as Record<string, QuestionOverride>) || {},
      hidden: (r.hidden as string[]) || [],
      custom: (r.custom as Question[]) || [],
    }
  }
  return { overrides: r as Record<string, QuestionOverride>, hidden: [], custom: [] }
}

export async function getAllOverrides(): Promise<Record<string, ModuleContentOverrides>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', `${OVERRIDE_KEY_PREFIX}%`)

  const result: Record<string, ModuleContentOverrides> = {}
  for (const row of data || []) {
    const slug = row.key.slice(OVERRIDE_KEY_PREFIX.length)
    try {
      result[slug] = normalizeOverrides(JSON.parse(row.value))
    } catch {
      result[slug] = emptyOverrides()
    }
  }
  return result
}

function applyOverrides(moduleInfo: ModuleInfo, moduleOverrides: ModuleContentOverrides | undefined): ModuleInfo {
  if (!moduleOverrides) return moduleInfo
  const hidden = new Set(moduleOverrides.hidden)
  const questions = moduleInfo.questions
    .filter(q => !hidden.has(q.slug))
    .map(q => ({ ...q, ...(moduleOverrides.overrides[q.slug] || {}) }))
  return { ...moduleInfo, questions: [...questions, ...moduleOverrides.custom] }
}

export interface CustomModuleDefinition {
  id: string
  slug: string
  ordre: number
  titre: string
  sousTitre: string | null
  description: string | null
  emoji: string | null
  gratuit: boolean
}

export async function getCustomModuleDefinitions(): Promise<CustomModuleDefinition[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('module_definitions')
    .select('id, slug, ordre, titre, sous_titre, description, emoji, gratuit')
    .order('ordre')

  return (data || []).map(d => ({
    id: d.id,
    slug: d.slug,
    ordre: d.ordre,
    titre: d.titre,
    sousTitre: d.sous_titre,
    description: d.description,
    emoji: d.emoji,
    gratuit: d.gratuit,
  }))
}

export async function getEffectiveModules(): Promise<ModuleInfo[]> {
  const [overrides, customDefs] = await Promise.all([getAllOverrides(), getCustomModuleDefinitions()])

  const staticModules = MODULES.map(m => applyOverrides(m, overrides[m.slug]))
  const customModules = customDefs.map(def => applyOverrides(
    {
      slug: def.slug,
      n: def.ordre,
      titre: def.titre,
      sousTitre: def.sousTitre ?? '',
      description: def.description ?? '',
      emoji: def.emoji ?? '✦',
      free: def.gratuit,
      questions: [],
    },
    overrides[def.slug]
  ))

  return [...staticModules, ...customModules].sort((a, b) => a.n - b.n)
}

export async function getEffectiveModuleBySlug(slug: string): Promise<ModuleInfo | undefined> {
  const modules = await getEffectiveModules()
  return modules.find(m => m.slug === slug)
}
