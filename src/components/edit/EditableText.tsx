'use client'

import { useState, useRef, useTransition, type ElementType } from 'react'
import { useEditMode } from './EditModeProvider'
import { saveContentOverride } from '@/app/actions/admin'

interface Props {
  /** Clé stable identifiant ce texte (ex: "landing.hero.titre"). */
  k: string
  /** Texte par défaut (utilisé tant qu'aucune réécriture n'existe). */
  children: string
  as?: ElementType
  className?: string
  style?: React.CSSProperties
  multiline?: boolean
}

export default function EditableText({ k, children, as: Tag = 'span', className, style, multiline }: Props) {
  const { isAdmin, editMode, overrides, setOverride } = useEditMode()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const value = overrides[k] ?? children

  if (!isAdmin || !editMode) {
    return <Tag className={className} style={style}>{value}</Tag>
  }

  function save() {
    const val = (multiline ? textareaRef.current?.value : inputRef.current?.value) ?? ''
    setEditing(false)
    if (val === value) return
    setOverride(k, val)
    startTransition(async () => { await saveContentOverride(k, val) })
  }

  if (editing) {
    const editStyle: React.CSSProperties = {
      ...style,
      background: '#fff9db',
      outline: '2px solid #f59e0b',
      width: '100%',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      padding: 2,
      borderRadius: 4,
      display: 'block',
    }
    return multiline ? (
      <textarea
        ref={textareaRef}
        defaultValue={value}
        autoFocus
        rows={4}
        className={className}
        style={editStyle}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        onBlur={save}
      />
    ) : (
      <input
        ref={inputRef}
        defaultValue={value}
        autoFocus
        className={className}
        style={editStyle}
        onKeyDown={e => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter') { e.preventDefault(); save() }
        }}
        onBlur={save}
      />
    )
  }

  return (
    <Tag
      className={className}
      style={{ ...style, outline: '1.5px dashed #f59e0b', outlineOffset: 2, cursor: 'text', borderRadius: 3 }}
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier ce texte"
    >
      {value}{isPending && ' …'}
    </Tag>
  )
}
