import { INTRO_PARAGRAPHS, INTRO_COMMENT_TITRE, INTRO_COMMENT_PARAGRAPHS, INTRO_OUTRO_PARAGRAPHS, INTRO_CLOSING } from '@/lib/intro-texte'

export default function IntroTexte() {
  return (
    <div style={{ fontSize: 14.5, lineHeight: 1.85, color: 'var(--ink-2, #3a352e)' }} className="flex flex-col gap-5">
      {INTRO_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}

      <div>
        <p className="font-serif font-bold" style={{ fontSize: 19, color: 'var(--ink)', marginBottom: 10 }}>{INTRO_COMMENT_TITRE}</p>
        {INTRO_COMMENT_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {INTRO_OUTRO_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}

      <p style={{ fontStyle: 'italic' }}>{INTRO_CLOSING}</p>
    </div>
  )
}
