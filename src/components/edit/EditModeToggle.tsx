'use client'

import { useEditMode } from './EditModeProvider'
import { Pencil, X } from 'lucide-react'

export default function EditModeToggle() {
  const { isAdmin, editMode, toggleEditMode } = useEditMode()
  if (!isAdmin) return null

  return (
    <button
      type="button"
      onClick={toggleEditMode}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 4px 16px rgba(0,0,0,.2)',
        background: editMode ? '#f59e0b' : '#1a1816',
        color: 'white',
      }}
    >
      {editMode ? <><X className="w-4 h-4" />Quitter le mode édition</> : <><Pencil className="w-4 h-4" />Mode édition</>}
    </button>
  )
}
