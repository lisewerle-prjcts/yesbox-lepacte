'use client'

import { usePathname } from 'next/navigation'
import { Pencil, Eye } from 'lucide-react'
import { useEditMode } from './EditModeContext'
import { useT } from '@/components/i18n/LocaleContext'

export default function EditModeToggle() {
  const { isAdmin, editMode, setEditMode } = useEditMode()
  const pathname = usePathname()
  const t = useT()

  if (!isAdmin || pathname?.startsWith('/admin')) return null

  return (
    <button
      onClick={() => setEditMode(!editMode)}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 18px',
        borderRadius: 999,
        background: editMode ? 'var(--brand)' : 'var(--dark)',
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: 'var(--shadow-lg)',
        border: 'none',
      }}
    >
      {editMode
        ? <><Pencil className="w-4 h-4" /> {t('Mode édition activé', 'Edit mode on')}</>
        : <><Eye className="w-4 h-4" /> {t('Activer le mode édition', 'Turn on edit mode')}</>}
    </button>
  )
}
