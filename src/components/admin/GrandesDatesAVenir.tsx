import Link from 'next/link'
import { CalendarHeart } from 'lucide-react'

// Grandes dates des 90 prochains jours (Couples & progression et Vue
// d'ensemble). Calcul : grandesDatesAVenir (src/lib/grandes-dates.ts).
export interface GrandeDateAVenir { type: 'rencontre' | 'mariage' | 'bilan'; le: string; annees: number | null; joursAvant: number; numero: number; nom: string }

const LIBELLE_GRANDE_DATE = { rencontre: 'anniversaire de couple', mariage: 'mariage', bilan: 'bilan annuel' }
const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Anniversaires de couple et de mariage et rendez-vous de bilan annuel
// des 90 prochains jours, pour préparer les e-mails.
export default function GrandesDatesAVenir({ dates }: { dates: GrandeDateAVenir[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarHeart className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        <h2 className="font-semibold" style={{ fontSize: 15, color: 'var(--ink)' }}>Grandes dates à venir (90 jours)</h2>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Un e-mail d&apos;alerte part aussi un mois avant chaque anniversaire. Les e-mails envoyés aux couples se valident dans <Link href="/admin#taches" style={{ color: 'var(--brand)' }}>Vue d&apos;ensemble &gt; Tâches</Link>.</p>
      {dates.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune date dans les 90 prochains jours.</p>
      ) : (
        <ul className="space-y-1.5">
          {dates.map(d => (
            <li key={`${d.numero}-${d.type}`} className="flex flex-wrap gap-x-2" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              <span className="font-mono" style={{ color: 'var(--muted)', minWidth: 110 }}>{dateLongue(d.le)}</span>
              <span><strong>Couple {d.numero}</strong>{d.nom ? ` — ${d.nom}` : ''}</span>
              <span style={{ color: 'var(--muted)' }}>
                · {LIBELLE_GRANDE_DATE[d.type]}{d.annees ? `, ${d.annees} an${d.annees > 1 ? 's' : ''}` : ''}
                {' · '}{d.joursAvant === 0 ? "aujourd'hui" : `dans ${d.joursAvant} jour${d.joursAvant > 1 ? 's' : ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

