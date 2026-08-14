'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { adminSaveSiteContent } from '@/app/actions/admin'

interface EditModeContextValue {
  content: Record<string, string>
  isAdmin: boolean
  editMode: boolean
  setEditMode: (v: boolean) => void
  saveContent: (key: string, value: string) => void
}

const EditModeContext = createContext<EditModeContextValue | null>(null)

export function EditModeProvider({
  children,
  isAdmin,
  initialContent,
}: {
  children: React.ReactNode
  isAdmin: boolean
  initialContent: Record<string, string>
}) {
  const [content, setContent] = useState(initialContent)
  const [editMode, setEditMode] = useState(false)

  const saveContent = useCallback((key: string, value: string) => {
    setContent(c => ({ ...c, [key]: value }))
    adminSaveSiteContent(key, value)
  }, [])

  const value = useMemo(
    () => ({ content, isAdmin, editMode, setEditMode, saveContent }),
    [content, isAdmin, editMode, saveContent]
  )

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

export function useEditMode() {
  const ctx = useContext(EditModeContext)
  if (!ctx) throw new Error('useEditMode doit être utilisé sous EditModeProvider')
  return ctx
}
