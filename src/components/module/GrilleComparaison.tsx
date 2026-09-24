import { cleColonne, libelleColonne, parseGrille } from '@/lib/questions'
import type { Question } from '@/types'

interface Props {
  q: Question
  maValeur: string | undefined | null
  valeurAutre: string | undefined | null
  monNom: string
  nomAutre: string
  sansReponse: string
  /** Libellé accessible des lignes où les deux réponses diffèrent. */
  libelleDifferent: string
  theme: 'dark' | 'light'
}

/** Tableau côte à côte des réponses des deux partenaires à une question "grille". */
export default function GrilleComparaison({ q, maValeur, valeurAutre, monNom, nomAutre, sansReponse, libelleDifferent, theme }: Props) {
  const mine = parseGrille(maValeur)
  const other = parseGrille(valeurAutre)
  const c = theme === 'dark'
    ? { bg: 'var(--dark-2)', line: 'var(--dark-line)', text: 'var(--dark-paper)', muted: 'var(--dark-muted)' }
    : { bg: 'var(--cream)', line: 'var(--line)', text: 'var(--ink-2)', muted: 'var(--muted)' }

  const cell = { padding: '8px 10px', borderTop: `1px solid ${c.line}`, fontSize: 13, lineHeight: 1.35 }

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.line}`, borderRadius: 'var(--r)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }} />
            <th scope="col" style={{ ...cell, borderTop: 'none', textAlign: 'left', fontSize: 12, fontWeight: 600, color: c.muted }}>{monNom}</th>
            <th scope="col" style={{ ...cell, borderTop: 'none', textAlign: 'left', fontSize: 12, fontWeight: 600, color: c.muted }}>{nomAutre}</th>
          </tr>
        </thead>
        <tbody>
          {(q.lignes ?? []).map((ligne, i) => {
            const a = mine[i]
            const b = other[i]
            const different = a !== undefined && b !== undefined && cleColonne(q, a, true) !== cleColonne(q, b, false)
            return (
              <tr key={i}>
                <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 500, color: c.muted }}>
                  {ligne}
                  {different && <span title={libelleDifferent} aria-label={libelleDifferent} style={{ color: 'var(--brand)', marginLeft: 6 }}>●</span>}
                </th>
                <td style={{ ...cell, color: a !== undefined ? c.text : c.muted, fontStyle: a !== undefined ? 'normal' : 'italic' }}>
                  {a !== undefined ? libelleColonne(q, a, monNom, nomAutre) : sansReponse}
                </td>
                <td style={{ ...cell, color: b !== undefined ? c.text : c.muted, fontStyle: b !== undefined ? 'normal' : 'italic' }}>
                  {b !== undefined ? libelleColonne(q, b, nomAutre, monNom) : sansReponse}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
