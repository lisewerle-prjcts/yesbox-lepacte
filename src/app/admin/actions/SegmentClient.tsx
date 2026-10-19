'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Send, Check, Download, Users } from 'lucide-react'
import { adminEnvoyerEmailSegment } from '@/app/actions/admin'
import {
  filtrerSegment, LIBELLES_CRITERES,
  type Critere, type FiltresSegment, type PersonneSegment, type TypeCritere,
} from '@/lib/segments'
import Alert from '@/components/ui/Alert'

interface ModuleInfo { slug: string; name: string }

const TYPES = Object.keys(LIBELLES_CRITERES) as TypeCritere[]

function dateFr(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : ''
}

// Export lisible directement par Excel : CSV séparé par des points-virgules,
// avec BOM pour que les accents s'affichent correctement.
function exporterCsv(personnes: PersonneSegment[], modules: ModuleInfo[]) {
  const entetes = [
    'Prénom', 'Nom', 'E-mail', 'E-mail confirmé', 'Couple', 'Pairé·e', 'Inscrit·e le', 'Dernière connexion', 'Code',
    'Modules terminés', ...modules.map((_, i) => `Fin M${i + 1}`), 'Pacte signé le', 'Abonnement résilié', 'Résilié le', 'Programme initial fini',
  ]
  const lignes = personnes.map(p => [
    p.prenom ?? '', p.nom ?? '', p.email, p.emailConfirme ? 'oui' : 'non', p.coupleNumero ?? '', p.paire ? 'oui' : 'non', dateFr(p.inscritLe), dateFr(p.derniereConnexion), p.code ?? '',
    Object.keys(p.modulesTermines).length,
    ...modules.map(m => (m.slug in p.modulesTermines ? dateFr(p.modulesTermines[m.slug]) || 'oui' : '')),
    dateFr(p.pacteSigneLe), p.resilie ? 'oui' : 'non', dateFr(p.resilieLe), p.programmeTermine ? 'oui' : 'non',
  ])
  const cellule = (v: string | number) => {
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + [entetes, ...lignes].map(l => l.map(cellule).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `segment-yesbox-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ListeCriteres({
  titre,
  aide,
  criteres,
  onChange,
  codes,
  modules,
  couleur,
}: {
  titre: string
  aide: string
  criteres: Critere[]
  onChange: (c: Critere[]) => void
  codes: string[]
  modules: ModuleInfo[]
  couleur: string
}) {
  const modifier = (i: number, c: Critere) => onChange(criteres.map((x, j) => (j === i ? c : x)))

  return (
    <div className="surface p-3" style={{ flex: 1, minWidth: 280 }}>
      <div className="font-mono font-bold mb-1" style={{ fontSize: 11, letterSpacing: '.08em', color: couleur }}>{titre}</div>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{aide}</p>
      <div className="space-y-2">
        {criteres.map((c, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <select
              className="field"
              style={{ flex: 1, minWidth: 180 }}
              value={c.type}
              onChange={e => modifier(i, { type: e.target.value as TypeCritere })}
            >
              {TYPES.map(t => <option key={t} value={t}>{LIBELLES_CRITERES[t]}</option>)}
            </select>
            {c.type === 'code' && (
              <select className="field" style={{ width: 160 }} value={c.valeur ?? ''} onChange={e => modifier(i, { ...c, valeur: e.target.value })}>
                <option value="">Choisir…</option>
                {codes.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            )}
            {c.type === 'module_termine' && (
              <select className="field" style={{ width: 200 }} value={c.valeur ?? ''} onChange={e => modifier(i, { ...c, valeur: e.target.value })}>
                <option value="">Choisir…</option>
                {modules.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}
              </select>
            )}
            {c.type === 'paire' && (
              <select className="field" style={{ width: 110 }} value={c.valeur ?? ''} onChange={e => modifier(i, { ...c, valeur: e.target.value })}>
                <option value="">Choisir…</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            )}
            {c.type === 'inactif' && (
              <input
                type="number"
                min={0}
                className="field"
                style={{ width: 90 }}
                placeholder="jours"
                value={c.valeur ?? ''}
                onChange={e => modifier(i, { ...c, valeur: e.target.value })}
              />
            )}
            <button
              onClick={() => onChange(criteres.filter((_, j) => j !== i))}
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}
              aria-label="Retirer ce critère"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...criteres, { type: 'code' }])}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: couleur }}
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter un critère
        </button>
      </div>
    </div>
  )
}

export default function SegmentClient({
  personnes,
  codes,
  modules,
}: {
  personnes: PersonneSegment[]
  codes: string[]
  modules: ModuleInfo[]
}) {
  const [avec, setAvec] = useState<Critere[]>([])
  const [sans, setSans] = useState<Critere[]>([])
  const [respecterDesinscription, setRespecterDesinscription] = useState(true)
  const [voirListe, setVoirListe] = useState(false)
  const [objet, setObjet] = useState('')
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resultat, setResultat] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const filtres: FiltresSegment = { avec, sans, respecterDesinscription }
  const segment = useMemo(
    () => filtrerSegment(personnes, { avec, sans, respecterDesinscription }),
    [personnes, avec, sans, respecterDesinscription],
  )

  async function envoyer() {
    if (!window.confirm(`Envoyer « ${objet} » à ${segment.length} personne${segment.length > 1 ? 's' : ''} ?`)) return
    setErreur(null)
    setResultat(null)
    setStatut('sending')
    try {
      const res = await adminEnvoyerEmailSegment(filtres, objet, message)
      if (res.error) {
        setErreur(res.error)
        setStatut('idle')
        return
      }
      const echecs = res.echecs ?? []
      setResultat(`${res.envoyes} e-mail${(res.envoyes ?? 0) > 1 ? 's' : ''} envoyé${(res.envoyes ?? 0) > 1 ? 's' : ''}${echecs.length ? ` — échec pour : ${echecs.join(', ')}` : ''}.`)
      setStatut('sent')
      setTimeout(() => setStatut('idle'), 3000)
    } catch {
      setErreur("L'envoi a échoué. Recharge la page et réessaie.")
      setStatut('idle')
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1" style={{ fontSize: 15 }}>Envoyer un message à un segment</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        Une personne est dans le segment si elle remplit tous les critères AVEC et aucun critère SANS.
        Un module est terminé quand il est révélé et que les deux ont écrit leur conclusion ; le programme
        initial est fini quand les modules 1 à 9 sont terminés et le pacte signé par les deux.
      </p>

      <div className="flex gap-3 flex-wrap mb-4">
        <ListeCriteres
          titre="AVEC"
          aide="Toutes ces conditions doivent être vraies."
          criteres={avec}
          onChange={setAvec}
          codes={codes}
          modules={modules}
          couleur="var(--sage)"
        />
        <ListeCriteres
          titre="SANS"
          aide="Exclut les personnes qui remplissent une de ces conditions."
          criteres={sans}
          onChange={setSans}
          codes={codes}
          modules={modules}
          couleur="#dc2626"
        />
      </div>

      <label className="flex items-center gap-2 mb-4" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
        <input type="checkbox" checked={respecterDesinscription} onChange={e => setRespecterDesinscription(e.target.checked)} />
        Exclure les personnes qui ont refusé les e-mails de rappel
      </label>

      <div className="surface p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2" style={{ fontSize: 14 }}>
          <Users className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <strong>{segment.length}</strong> personne{segment.length > 1 ? 's' : ''} concernée{segment.length > 1 ? 's' : ''}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>sur {personnes.length}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setVoirListe(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}
          >
            {voirListe ? 'Masquer la liste' : 'Voir la liste'}
          </button>
          <button
            onClick={() => exporterCsv(segment, modules)}
            disabled={!segment.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--sage)', opacity: segment.length ? 1 : 0.5 }}
          >
            <Download className="w-3.5 h-3.5" /> Exporter pour Excel
          </button>
        </div>
      </div>

      {voirListe && (
        <div className="mb-4 overflow-x-auto" style={{ maxHeight: 320 }}>
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                <th className="py-1 pr-3">Personne</th>
                <th className="py-1 pr-3">E-mail</th>
                <th className="py-1 pr-3">Couple</th>
                <th className="py-1 pr-3">Pairé·e</th>
                <th className="py-1 pr-3">E-mail confirmé</th>
                <th className="py-1 pr-3">Code</th>
                <th className="py-1 pr-3">Modules terminés</th>
                <th className="py-1 pr-3">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {segment.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-1 pr-3">{[p.prenom, p.nom].filter(Boolean).join(' ') || '—'}</td>
                  <td className="py-1 pr-3 font-mono">{p.email}</td>
                  <td className="py-1 pr-3">{p.coupleNumero ?? '—'}</td>
                  <td className="py-1 pr-3">{p.paire ? 'oui' : 'non'}</td>
                  <td className="py-1 pr-3">{p.emailConfirme ? 'oui' : 'non'}</td>
                  <td className="py-1 pr-3 font-mono">{p.code ?? '—'}</td>
                  <td className="py-1 pr-3">{Object.keys(p.modulesTermines).length}/{modules.length}</td>
                  <td className="py-1 pr-3">{dateFr(p.derniereConnexion) || 'jamais'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {erreur && <Alert type="error" message={erreur} className="mb-4" />}
      {resultat && <Alert type="success" message={resultat} className="mb-4" />}

      <div className="space-y-3">
        <div>
          <label className="flabel">Objet</label>
          <input type="text" className="field" value={objet} onChange={e => setObjet(e.target.value)} placeholder="Objet de l'email" />
        </div>
        <div>
          <label className="flabel">Message (texte, les retours à la ligne sont conservés ; {'{prenom}'} est remplacé par le prénom)</label>
          <textarea className="field" rows={6} value={message} onChange={e => setMessage(e.target.value)} placeholder="Bonjour {prenom},&#10;&#10;..." />
        </div>
        <button
          onClick={envoyer}
          disabled={!segment.length || !objet.trim() || !message.trim() || statut === 'sending'}
          className="btn-brand flex items-center gap-2"
        >
          {statut === 'sending'
            ? 'Envoi en cours…'
            : statut === 'sent'
              ? <><Check className="w-4 h-4" /> Envoyé !</>
              : <><Send className="w-4 h-4" /> Envoyer à {segment.length} personne{segment.length > 1 ? 's' : ''}</>}
        </button>
      </div>
    </div>
  )
}
