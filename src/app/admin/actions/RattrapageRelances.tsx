'use client'

import { useState } from 'react'
import { adminEnvoyerRelancesDemarrage } from '@/app/actions/admin'
import Alert from '@/components/ui/Alert'

export interface LigneRattrapage {
  coupleId: string
  couple: string
  situation: string
  email: string
  destinataires: string[]
}

// Aperçu et envoi immédiat des relances de démarrage dues aujourd'hui
// (Admin > Actions manuelles). Sans clic, elles partent quand même avec la
// tâche du matin.
export default function RattrapageRelances({ lignes }: { lignes: LigneRattrapage[] }) {
  const [envoi, setEnvoi] = useState(false)
  const [resultat, setResultat] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const personnes = lignes.reduce((n, l) => n + l.destinataires.length, 0)

  async function envoyer() {
    if (!confirm(`Envoyer maintenant ${personnes} e-mail${personnes > 1 ? 's' : ''} de relance ?`)) return
    setEnvoi(true)
    setResultat(null)
    try {
      const r = await adminEnvoyerRelancesDemarrage()
      setResultat('error' in r && r.error
        ? { type: 'error', message: r.error }
        : { type: 'success', message: `${r.envoyes ?? 0} e-mail${(r.envoyes ?? 0) > 1 ? 's' : ''} envoyé${(r.envoyes ?? 0) > 1 ? 's' : ''}.` })
    } catch (e) {
      setResultat({ type: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <details className="card p-5 mb-6">
      <summary className="cursor-pointer font-semibold" style={{ fontSize: 16, color: 'var(--ink)' }}>
        Relances des inscrit·es qui n’ont pas concrétisé — {lignes.length} couple{lignes.length > 1 ? 's' : ''} à relancer aujourd’hui
      </summary>
      <div className="mt-3 space-y-1" style={{ fontSize: 12, color: 'var(--muted)' }}>
        <p>Couples pas encore au complet, ou au complet sans aucune réponse, inscrits depuis 3 à 90 jours. Chacun reçoit une seule relance, celle du palier atteint (3 ou 10 jours), jamais deux fois la même.</p>
        <p>Sans action de ta part, ces e-mails partent avec la tâche du matin. Le bouton les envoie tout de suite.</p>
      </div>
      {lignes.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full" style={{ fontSize: 12.5, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                <th className="py-1.5 pr-3">Couple</th>
                <th className="py-1.5 pr-3">Situation</th>
                <th className="py-1.5 pr-3">E-mail</th>
                <th className="py-1.5">Destinataires</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l.coupleId} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink)', fontWeight: 500 }}>{l.couple}</td>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink-2)' }}>{l.situation}</td>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink-2)' }}>{l.email}</td>
                  <td className="py-1.5" style={{ color: 'var(--muted)' }}>{l.destinataires.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resultat && <Alert type={resultat.type} message={resultat.message} className="mt-4" />}
      <button type="button" className="btn-primary mt-4" disabled={envoi || !lignes.length} onClick={envoyer}>
        {envoi ? 'Envoi…' : `Envoyer maintenant (${personnes} e-mail${personnes > 1 ? 's' : ''})`}
      </button>
    </details>
  )
}
