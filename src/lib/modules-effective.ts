import { createAdminClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import type { ModuleInfo, Question } from '@/types'

export const OVERRIDE_KEY_PREFIX = 'module_questions_override::'

export type QuestionOverride = Partial<Pick<Question, 'texte' | 'hint' | 'options' | 'labelMin' | 'labelMax'>>
export type ModuleOverrides = Record<string, QuestionOverride> // question_slug -> override

export async function getAllOverrides(): Promise<Record<string, ModuleOverrides>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', `${OVERRIDE_KEY_PREFIX}%`)

  const overrides: Record<string, ModuleOverrides> = {}
  for (const row of data || []) {
    const slug = row.key.slice(OVERRIDE_KEY_PREFIX.length)
    try {
      overrides[slug] = JSON.parse(row.value)
    } catch {
      overrides[slug] = {}
    }
  }
  return overrides
}

function applyOverrides(moduleInfo: ModuleInfo, moduleOverrides: ModuleOverrides | undefined): ModuleInfo {
  if (!moduleOverrides) return moduleInfo
  return {
    ...moduleInfo,
    questions: moduleInfo.questions.map(q => ({ ...q, ...(moduleOverrides[q.slug] || {}) })),
  }
}

export async function getEffectiveModules(): Promise<ModuleInfo[]> {
  const overrides = await getAllOverrides()
  return MODULES.map(m => applyOverrides(m, overrides[m.slug]))
}

export async function getEffectiveModuleBySlug(slug: string): Promise<ModuleInfo | undefined> {
  const base = MODULES.find(m => m.slug === slug)
  if (!base) return undefined
  const overrides = await getAllOverrides()
  return applyOverrides(base, overrides[slug])
}
