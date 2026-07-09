import { INTRO_PARAGRAPHS, INTRO_COMMENT_TITRE, INTRO_COMMENT_PARAGRAPHS, INTRO_OUTRO_PARAGRAPHS, INTRO_CLOSING } from '@/lib/intro-texte'
import EditableText from '@/components/edit/EditableText'

export default function IntroTexte() {
  return (
    <div style={{ fontSize: 14.5, lineHeight: 1.85, color: 'var(--ink-2, #3a352e)' }} className="flex flex-col gap-5">
      {INTRO_PARAGRAPHS.map((p, i) => (
        <p key={i}><EditableText k={`intro.p${i}`} as="span" multiline>{p}</EditableText></p>
      ))}

      <div>
        <p className="font-serif font-bold" style={{ fontSize: 19, color: 'var(--ink)', marginBottom: 10 }}>
          <EditableText k="intro.comment_titre" as="span">{INTRO_COMMENT_TITRE}</EditableText>
        </p>
        {INTRO_COMMENT_PARAGRAPHS.map((p, i) => (
          <p key={i}><EditableText k={`intro.comment.p${i}`} as="span" multiline>{p}</EditableText></p>
        ))}
      </div>

      {INTRO_OUTRO_PARAGRAPHS.map((p, i) => (
        <p key={i}><EditableText k={`intro.outro.p${i}`} as="span" multiline>{p}</EditableText></p>
      ))}

      <p style={{ fontStyle: 'italic' }}><EditableText k="intro.closing" as="span" multiline>{INTRO_CLOSING}</EditableText></p>
    </div>
  )
}
