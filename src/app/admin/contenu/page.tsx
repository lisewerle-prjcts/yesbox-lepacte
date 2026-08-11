import { MODULES } from '@/lib/modules-data'
import { getAllOverrides } from '@/lib/modules-effective'
import ContenuClient from './ContenuClient'

export default async function AdminContenuPage() {
  const overrides = await getAllOverrides()

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Contenu des modules</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Modifie, retire ou ajoute des questions dans chaque module. Les changements s&apos;appliquent immédiatement pour tous les couples.
        </p>
      </div>
      <ContenuClient modules={MODULES} overrides={overrides} />
    </div>
  )
}
