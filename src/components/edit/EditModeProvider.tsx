'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface EditModeContextValue {
  isAdmin: boolean
  editMode: boolean
  toggleEditMode: () => void
  overrides: Record<string, string>
  setOverride: (key: string, value: string) => void
}

const EditModeContext = createContext<EditModeContextValue | null>(null)

const STORAGE_KEY = 'yesbox_edit_mode'

export function EditModeProvider({ isAdmin, initialOverrides, children }: { isAdmin: boolean; initialOverrides: Record<string, string>; children: React.ReactNode }) {
  const [editMode, setEditMode] = useState(false)
  const [overrides, setOverrides] = useState(initialOverrides)

  useEffect(() => {
    if (isAdmin && typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1') setEditMode(true)
  }, [isAdmin])

  const toggleEditMode = useCallback(() => {
    setEditMode(v => {
      const next = !v
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const setOverride = useCallback((key: string, value: string) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }, [])

  return (
    <EditModeContext.Provider value={{ isAdmin, editMode: isAdmin && editMode, toggleEditMode, overrides, setOverride }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode(): EditModeContextValue {
  const ctx = useContext(EditModeContext)
  if (!ctx) return { isAdmin: false, editMode: false, toggleEditMode: () => {}, overrides: {}, setOverride: () => {} }
  return ctx
}
