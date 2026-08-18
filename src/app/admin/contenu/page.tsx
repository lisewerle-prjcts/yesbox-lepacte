import { MODULES } from '@/lib/modules-data'
import { getAllOverrides, getCustomModuleDefinitions, getAllModuleMetaOverrides } from '@/lib/modules-effective'
import ContenuClient from './ContenuClient'
import type { ModuleInfo } from '@/types'

export default async function AdminContenuPage() {
  const [overrides, customDefs, metaOverrides] = await Promise.all([
    getAllOverrides(),
    getCustomModuleDefinitions(),
    getAllModuleMetaOverrides(),
  ])

  const baseModules: ModuleInfo[] = MODULES.map(m => {
    const meta = metaOverrides[m.slug]
    if (!meta) return m
    return {
      ...m,
      titre: meta.titre ?? m.titre,
      sousTitre: meta.sousTitre ?? m.sousTitre,
      description: meta.description ?? m.description,
      emoji: meta.emoji ?? m.emoji,
      n: meta.n ?? m.n,
    }
  })

  const customModules: ModuleInfo[] = customDefs.map(def => ({
    slug: def.slug,
    n: def.ordre,
    titre: def.titre,
    sousTitre: def.sousTitre ?? '',
    description: def.description ?? '',
    emoji: def.emoji ?? '✦',
    free: def.gratuit,
    questions: [],
  }))

  const modules = [...baseModules, ...customModules].sort((a, b) => a.n - b.n)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Contenu des modules</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Modifie, retire ou ajoute des questions dans chaque module, renomme-le ou change sa place, ou crée un nouveau module. Les changements s&apos;appliquent immédiatement pour tous les couples.
        </p>
      </div>
      <ContenuClient modules={modules} overrides={overrides} customDefinitions={customDefs} moduleMetaOverrides={metaOverrides} />
    </div>
  )
}
