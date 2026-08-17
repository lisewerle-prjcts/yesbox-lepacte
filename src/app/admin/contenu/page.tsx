import { MODULES } from '@/lib/modules-data'
import { getAllOverrides, getCustomModuleDefinitions } from '@/lib/modules-effective'
import ContenuClient from './ContenuClient'
import type { ModuleInfo } from '@/types'

export default async function AdminContenuPage() {
  const [overrides, customDefs] = await Promise.all([getAllOverrides(), getCustomModuleDefinitions()])

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

  const modules = [...MODULES, ...customModules].sort((a, b) => a.n - b.n)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Contenu des modules</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Modifie, retire ou ajoute des questions dans chaque module, ou crée un nouveau module. Les changements s&apos;appliquent immédiatement pour tous les couples.
        </p>
      </div>
      <ContenuClient modules={modules} overrides={overrides} customDefinitions={customDefs} />
    </div>
  )
}
