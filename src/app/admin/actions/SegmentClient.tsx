'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Download, Users } from 'lucide-react'
import { adminEnvoyerEmailSegment } from '@/app/actions/admin'
import {
  filtrerSegment, LIBELLES_CRITERES,
  type Critere, type FiltresSegment, type PersonneSegment, type TypeCritere,
} from '@/lib/segments'
import Alert from '@/components/ui/Alert'
import ComposeurEmail, { BoutonsEnvoi, MESSAGE_VIDE, type MessageManuel, type ModeEnvoi, type ModeleComposeur } from '@/components/admin/ComposeurEmail'

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
  modeles,
}: {
  personnes: PersonneSegment[]
  codes: string[]
  modules: ModuleInfo[]
  modeles: ModeleComposeur[]
}) {
  const [avec, setAvec] = useState<Critere[]>([])
  const [sans, setSans] = useState<Critere[]>([])
  const [respecterDesinscription, setRespecterDesinscription] = useState(true)
  const [voirListe, setVoirListe] = useState(false)
  const [message, setMessage] = useState<MessageManuel>(MESSAGE_VIDE)
  const [envoi, setEnvoi] = useState<ModeEnvoi | null>(null)
  const [resultat, setResultat] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  // Personnes décochées une à une dans la liste : on garde les exclusions
  // plutôt que la sélection, pour qu'une personne qui entre dans le segment
  // en changeant les critères soit cochée d'office.
  const [decochees, setDecochees] = useState<Set<string>>(new Set())

  const filtres: FiltresSegment = { avec, sans, respecterDesinscription }
  const segment = useMemo(
    () => filtrerSegment(personnes, { avec, sans, respecterDesinscription }),
    [personnes, avec, sans, respecterDesinscription],
  )
  const selection = useMemo(() => segment.filter(p => !decochees.has(p.id)), [segment, decochees])
  const toutCoche = selection.length === segment.length
  const exclusDuSegment = segment.filter(p => decochees.has(p.id)).map(p => p.id)

  function basculer(id: string) {
    setDecochees(d => {
      const n = new Set(d)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function basculerTout() {
    setDecochees(d => {
      const n = new Set(d)
      for (const p of segment) {
        if (toutCoche) n.add(p.id)
        else n.delete(p.id)
      }
      return n
    })
  }

  async function envoyer(mode: ModeEnvoi) {
    const version = mode === 'fr' ? 'la version française' : mode === 'en' ? 'la version anglaise' : 'la version de la langue choisie par chaque personne'
    if (!window.confirm(`Envoyer ${version} à ${selection.length} personne${selection.length > 1 ? 's' : ''} ?`)) return
    setErreur(null)
    setResultat(null)
    setEnvoi(mode)
    try {
      const res = await adminEnvoyerEmailSegment(filtres, message, mode, exclusDuSegment)
      if (res.error) {
        setErreur(res.error)
      } else {
        const echecs = res.echecs ?? []
        const n = res.envoyes ?? 0
        const detail = mode === 'langue' && res.parLangue ? ` (${res.parLangue.fr} en français, ${res.parLangue.en} en anglais)` : ''
        setResultat(`${n} e-mail${n > 1 ? 's' : ''} envoyé${n > 1 ? 's' : ''}${detail}${echecs.length ? ` — échec pour : ${echecs.join(', ')}` : ''}.`)
      }
    } catch {
      setErreur("L'envoi a échoué. Recharge la page et réessaie.")
    }
    setEnvoi(null)
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
          <strong>{selection.length}</strong> personne{selection.length > 1 ? 's' : ''} sélectionnée{selection.length > 1 ? 's' : ''}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {selection.length < segment.length ? `sur ${segment.length} dans le segment` : `sur ${personnes.length}`}
          </span>
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
            onClick={() => exporterCsv(selection, modules)}
            disabled={!selection.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--sage)', opacity: selection.length ? 1 : 0.5 }}
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
                <th className="py-1 pr-2">
                  <input
                    type="checkbox"
                    checked={segment.length > 0 && toutCoche}
                    ref={el => { if (el) el.indeterminate = selection.length > 0 && !toutCoche }}
                    onChange={basculerTout}
                    aria-label={toutCoche ? 'Tout décocher' : 'Tout cocher'}
                    title={toutCoche ? 'Tout décocher' : 'Tout cocher'}
                  />
                </th>
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
                <tr key={p.id} onClick={() => basculer(p.id)} style={{ borderTop: '1px solid var(--line)', cursor: 'pointer', opacity: decochees.has(p.id) ? 0.45 : 1 }}>
                  <td className="py-1 pr-2">
                    <input
                      type="checkbox"
                      checked={!decochees.has(p.id)}
                      onChange={() => basculer(p.id)}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Inclure ${p.email}`}
                    />
                  </td>
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
        <ComposeurEmail
          modeles={modeles}
          message={message}
          onChange={setMessage}
          aideVariables="Remplacées pour chaque personne : {prenom}, {partenaire} (prénom de l’autre membre du couple), {code} (code couple)."
        />
        <BoutonsEnvoi message={selection.length ? message : MESSAGE_VIDE} envoi={envoi} onEnvoyer={envoyer} libelle={`(${selection.length})`} />
      </div>
    </div>
  )
}
