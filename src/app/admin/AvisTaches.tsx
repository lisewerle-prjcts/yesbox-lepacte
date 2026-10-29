'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Star, Mail } from 'lucide-react'
import { adminPublierAvis, adminRefuserAvis, adminRenvoyerCodeAvis } from '@/app/actions/avis'

export interface AvisAdmin {
  id: string
  prenom: string
  email: string | null
  /** « octobre 2026 » */
  debut: string
  note: number
  texte: string
  statut: 'en_attente' | 'publie' | 'refuse'
  creeLe: string
  code: string | null
  codeUtiliseLe: string | null
}

const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

// Avis laissés sur /avis (Vue d'ensemble > Tâches) : ceux en attente à
// publier ou refuser, puis les avis publiés, qu'on peut retirer de l'accueil.
export default function AvisTaches({ avis, tableManquante }: { avis: AvisAdmin[]; tableManquante: boolean }) {
  const [voirPublies, setVoirPublies] = useState(false)
  const enAttente = avis.filter(a => a.statut === 'en_attente')
  const publies = avis.filter(a => a.statut === 'publie')
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-1" style={{ fontSize: 14, color: 'var(--ink)' }}>Avis à valider</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
        Publié, l’avis apparaît sur l’accueil (et dans la note moyenne vue par Google) et son auteur reçoit par e-mail un code de 10 € de réduction.
      </p>
      {tableManquante && (
        <p className="mb-3" style={{ fontSize: 12, color: '#dc2626' }}>
          La table avis n’existe pas encore : lance la commande SQL de la dernière mise à jour dans Supabase.
        </p>
      )}
      {enAttente.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun avis en attente.</p>
      ) : (
        <div className="space-y-3">{enAttente.map(a => <LigneAvis key={a.id} avis={a} />)}</div>
      )}
      {publies.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setVoirPublies(v => !v)} className="text-xs" style={{ color: 'var(--brand)' }}>
            {voirPublies ? 'Masquer' : 'Voir'} les {publies.length} avis publiés
          </button>
          {voirPublies && <div className="space-y-3 mt-3">{publies.map(a => <LigneAvis key={a.id} avis={a} />)}</div>}
        </div>
      )}
    </div>
  )
}

function LigneAvis({ avis }: { avis: AvisAdmin }) {
  const router = useRouter()
  const [statut, setStatut] = useState<'idle' | 'busy'>('idle')
  const [info, setInfo] = useState<{ ok: boolean; texte: string } | null>(null)
  const publie = avis.statut === 'publie'

  async function agir(action: 'publier' | 'refuser' | 'renvoyer') {
    if (action === 'refuser' && publie && !confirm('Retirer cet avis de l’accueil ? Le code déjà envoyé reste valable.')) return
    setStatut('busy')
    setInfo(null)
    const res = action === 'publier' ? await adminPublierAvis(avis.id) : action === 'refuser' ? await adminRefuserAvis(avis.id) : await adminRenvoyerCodeAvis(avis.id)
    setStatut('idle')
    if ('error' in res) { setInfo({ ok: false, texte: res.error }); return }
    if (action === 'renvoyer') { setInfo({ ok: true, texte: 'Code renvoyé par e-mail.' }); return }
    if ('emailEnvoye' in res && !res.emailEnvoye && !avis.code) {
      setInfo({ ok: false, texte: 'Avis publié, mais l’e-mail avec le code n’a pas pu partir : utilise « Renvoyer le code ».' })
    }
    router.refresh()
  }

  return (
    <div className="surface p-4" style={{ borderLeft: `3px solid ${publie ? 'var(--sage)' : '#d97706'}` }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p style={{ fontSize: 14, color: 'var(--ink)' }}>
            <strong>{avis.prenom}</strong>
            <span className="ml-2" style={{ color: 'var(--brand)', letterSpacing: 1 }} aria-label={`${avis.note} sur 5`}>
              {Array.from({ length: 5 }, (_, i) => <Star key={i} className="w-3.5 h-3.5 inline" fill={i < avis.note ? 'currentColor' : 'none'} />)}
            </span>
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            A commencé en {avis.debut} · envoyé le {dateCourte(avis.creeLe)}{avis.email ? ` · ${avis.email}` : ''}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: publie ? 'var(--sage)' : '#d97706' }}>{publie ? '✓ Publié' : 'À valider'}</span>
      </div>
      <blockquote className="font-serif mt-3" style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: 'var(--ink)', whiteSpace: 'pre-line' }}>
        « {avis.texte} »
      </blockquote>
      {avis.code && (
        <p className="mt-2" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Code envoyé : <span className="font-mono">{avis.code}</span> · {avis.codeUtiliseLe ? `utilisé le ${dateCourte(avis.codeUtiliseLe)}` : 'pas encore utilisé'}
        </p>
      )}
      {info && <p className="mt-2" style={{ fontSize: 12, color: info.ok ? 'var(--sage)' : '#dc2626' }}>{info.texte}</p>}
      <div className="flex items-center gap-3 flex-wrap mt-3">
        {!publie && (
          <>
            <button onClick={() => agir('publier')} disabled={statut === 'busy'} className="btn-brand text-sm py-2 px-4 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {statut === 'busy' ? 'Un instant…' : avis.code ? 'Publier' : 'Publier et envoyer le code'}
            </button>
            <button onClick={() => agir('refuser')} disabled={statut === 'busy'} className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
              <X className="w-4 h-4" /> Refuser
            </button>
          </>
        )}
        {publie && (
          <button onClick={() => agir('refuser')} disabled={statut === 'busy'} className="text-xs" style={{ color: 'var(--muted)' }}>
            Retirer de l’accueil
          </button>
        )}
        {avis.code && !avis.codeUtiliseLe && (
          <button onClick={() => agir('renvoyer')} disabled={statut === 'busy'} className="text-xs flex items-center gap-1" style={{ color: 'var(--brand)' }}>
            <Mail className="w-3.5 h-3.5" /> Renvoyer le code
          </button>
        )}
      </div>
    </div>
  )
}
