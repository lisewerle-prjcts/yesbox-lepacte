import { REGLES_DU_JEU_TITRE, REGLES_DU_JEU } from '@/lib/intro-texte'
import EditableText from '@/components/edit/EditableText'

export default function ReglesDuJeu() {
  return (
    <div>
      <p className="font-serif font-bold" style={{ fontSize: 19, color: 'var(--ink)', marginBottom: 14 }}>
        <EditableText k="regles.titre" as="span">{REGLES_DU_JEU_TITRE}</EditableText>
      </p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
        {REGLES_DU_JEU.map((r, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2, #3a352e)' }}>
            <span style={{ color: 'var(--brand)', fontWeight: 700, flexShrink: 0 }}>✦</span>
            <EditableText k={`regles.point${i}`} as="span" multiline>{r}</EditableText>
          </li>
        ))}
      </ul>
    </div>
  )
}
