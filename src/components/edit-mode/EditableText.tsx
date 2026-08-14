'use client'

import { useState, type CSSProperties, type ElementType, type KeyboardEvent, type MouseEvent } from 'react'
import { useEditMode } from './EditModeContext'

interface EditableTextProps {
  /** Clé unique et stable identifiant ce texte (ex: "home.hero.title"). */
  id: string
  /** Texte par défaut, affiché tant qu'aucune valeur n'a été enregistrée. */
  children: string
  as?: ElementType
  className?: string
  style?: CSSProperties
  multiline?: boolean
}

export default function EditableText({ id, children, as, className, style, multiline = false }: EditableTextProps) {
  const { content, isAdmin, editMode, saveContent } = useEditMode()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const Tag = (as || 'span') as ElementType
  const value = content[id] ?? children

  if (!isAdmin || !editMode) {
    return <Tag className={className} style={style}>{value}</Tag>
  }

  function startEdit(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    if (draft.trim() && draft !== value) saveContent(id, draft)
  }

  if (editing) {
    const editStyle: CSSProperties = {
      ...style,
      background: 'var(--brand-tint)',
      border: '1.5px solid var(--brand)',
      borderRadius: 6,
      outline: 'none',
      color: 'var(--ink)',
      padding: '2px 6px',
      font: 'inherit',
      width: multiline ? '100%' : `${Math.max(draft.length, 6)}ch`,
      maxWidth: '100%',
    }
    return multiline ? (
      <textarea
        autoFocus
        className={className}
        style={{ ...editStyle, display: 'block', minHeight: '3.5em' }}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onClick={e => e.stopPropagation()}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
        }}
      />
    ) : (
      <input
        autoFocus
        type="text"
        className={className}
        style={editStyle}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onClick={e => e.stopPropagation()}
        onFocus={e => e.target.select()}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter') commit()
        }}
      />
    )
  }

  return (
    <Tag
      className={className}
      style={{
        ...style,
        outline: '1.5px dashed var(--brand)',
        outlineOffset: 2,
        borderRadius: 3,
        cursor: 'text',
      }}
      onClick={startEdit}
      title="Cliquer pour modifier ce texte"
    >
      {value}
    </Tag>
  )
}
