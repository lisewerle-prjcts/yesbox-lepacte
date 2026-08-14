'use client'

import { usePathname } from 'next/navigation'
import { Pencil, Eye } from 'lucide-react'
import { useEditMode } from './EditModeContext'

export default function EditModeToggle() {
  const { isAdmin, editMode, setEditMode } = useEditMode()
  const pathname = usePathname()

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
        ? <><Pencil className="w-4 h-4" /> Mode édition activé</>
        : <><Eye className="w-4 h-4" /> Activer le mode édition</>}
    </button>
  )
}
