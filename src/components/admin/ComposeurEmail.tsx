'use client'

import { useMemo, useState } from 'react'
import { Eye, EyeOff, Languages } from 'lucide-react'
import { adminTraduireEmail } from '@/app/actions/admin'
import { FAMILLES, type ContenuEmail, type FamilleEmail } from '@/lib/modeles-email/catalogue'
import { rendreCorps, rendreObjet, variablesNonRemplacees } from '@/lib/modeles-email/rendu'

export type Langue = 'fr' | 'en'
export type ModeEnvoi = 'fr' | 'en' | 'langue'
export interface MessageManuel { fr: ContenuEmail; en: ContenuEmail; modele?: string | null }
export interface ModeleComposeur { cle: string; famille: FamilleEmail; nom: string; fr: ContenuEmail; en: ContenuEmail }

export const MESSAGE_VIDE: MessageManuel = { fr: { objet: '', corps: '' }, en: { objet: '', corps: '' }, modele: null }

const VARIABLES_MANUELLES = ['prenom', 'partenaire', 'code']
const EXEMPLE = { prenom: 'Camille', partenaire: 'Sacha', code: 'A1B2C3' }

// Langues à remplir pour ce mode d'envoi.
export function languesDuMode(mode: ModeEnvoi): Langue[] {
  return mode === 'langue' ? ['fr', 'en'] : [mode]
}

export function messagePret(message: MessageManuel, mode: ModeEnvoi) {
  return languesDuMode(mode).every(l => message[l].objet.trim() && message[l].corps.trim())
    && variablesRestantes(message, languesDuMode(mode)).length === 0
}

function variablesRestantes(message: MessageManuel, langues: Langue[]) {
  return variablesNonRemplacees(
    langues.flatMap(l => [message[l].objet, message[l].corps]),
    Object.fromEntries(VARIABLES_MANUELLES.map(v => [v, ''])),
  )
}

// Rédaction d'un e-mail manuel : à partir de rien ou d'un modèle d'e-mail
// automatique, avec une version française et une version anglaise.
export default function ComposeurEmail({
  modeles,
  message,
  onChange,
  aideVariables,
}: {
  modeles: ModeleComposeur[]
  message: MessageManuel
  onChange: (m: MessageManuel) => void
  aideVariables: string
}) {
  const [onglet, setOnglet] = useState<Langue>('fr')
  const [apercu, setApercu] = useState(false)
  const [traduction, setTraduction] = useState<'idle' | 'busy'>('idle')
  const [erreurTraduction, setErreurTraduction] = useState<string | null>(null)
  const contenu = message[onglet]
  const frRempli = !!(message.fr.objet.trim() || message.fr.corps.trim())
  const enVide = !message.en.objet.trim() && !message.en.corps.trim()
  const restantes = useMemo(() => variablesRestantes(message, ['fr', 'en']), [message])

  function choisirModele(cle: string) {
    const avecTexte = ['fr', 'en'].some(l => message[l as Langue].objet.trim() || message[l as Langue].corps.trim())
    if (avecTexte && !window.confirm('Remplacer le texte en cours par ce modèle ?')) return
    if (!cle) { onChange(MESSAGE_VIDE); return }
    const m = modeles.find(x => x.cle === cle)
    if (m) onChange({ fr: { ...m.fr }, en: { ...m.en }, modele: m.cle })
  }

  // Version anglaise remplie à partir du français (API Claude, côté serveur).
  async function traduire() {
    if (!enVide && !window.confirm('Remplacer la version anglaise par une nouvelle traduction du français ?')) return
    setTraduction('busy')
    setErreurTraduction(null)
    const res = await adminTraduireEmail(message.fr)
    setTraduction('idle')
    if ('error' in res) { setErreurTraduction(res.error); return }
    onChange({ ...message, en: res.en })
  }

  // Ouvrir la version anglaise encore vide la traduit d'office.
  function ouvrirOnglet(l: Langue) {
    setOnglet(l)
    if (l === 'en' && enVide && frRempli && traduction === 'idle') traduire()
  }

  function modifier(champ: keyof ContenuEmail, valeur: string) {
    onChange({ ...message, [onglet]: { ...contenu, [champ]: valeur } })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="flabel">Partir de</label>
        <select className="field" value={message.modele ?? ''} onChange={e => choisirModele(e.target.value)}>
          <option value="">Un message vierge</option>
          {FAMILLES.map(f => (
            <optgroup key={f.cle} label={f.nom}>
              {modeles.filter(m => m.famille === f.cle).map(m => <option key={m.cle} value={m.cle}>{m.nom}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex gap-1">
        {(['fr', 'en'] as const).map(l => {
          const rempli = message[l].objet.trim() && message[l].corps.trim()
          return (
            <button
              key={l}
              type="button"
              onClick={() => ouvrirOnglet(l)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: onglet === l ? 'var(--brand)' : 'var(--paper)', color: onglet === l ? 'white' : 'var(--ink-2)', border: '1px solid var(--line)' }}
            >
              {l === 'fr' ? 'Version française' : 'Version anglaise'} {rempli ? '✓' : ''}
            </button>
          )
        })}
        {onglet === 'en' && frRempli && (
          <button
            type="button"
            onClick={traduire}
            disabled={traduction === 'busy'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-auto"
            style={{ background: 'var(--paper)', color: 'var(--brand)', border: '1px solid var(--line)' }}
          >
            <Languages className="w-3.5 h-3.5" /> {traduction === 'busy' ? 'Traduction…' : enVide ? 'Traduire le français' : 'Retraduire le français'}
          </button>
        )}
      </div>
      {traduction === 'busy' && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Traduction de la version française en cours…</p>}
      {erreurTraduction && <p style={{ fontSize: 12, color: '#dc2626' }}>{erreurTraduction}</p>}
      {onglet === 'en' && !enVide && traduction === 'idle' && (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>Relis la traduction avant l’envoi : tu peux la modifier ci-dessous.</p>
      )}

      <div>
        <label className="flabel">Objet ({onglet === 'fr' ? 'FR' : 'EN'})</label>
        <input type="text" className="field" readOnly={traduction === 'busy'} value={contenu.objet} onChange={e => modifier('objet', e.target.value)} placeholder={onglet === 'fr' ? 'Objet de l’e-mail' : 'Email subject'} />
      </div>
      <div>
        <label className="flabel">Message ({onglet === 'fr' ? 'FR' : 'EN'})</label>
        <textarea className="field font-mono" rows={10} style={{ fontSize: 12.5 }} readOnly={traduction === 'busy'} value={contenu.corps} onChange={e => modifier('corps', e.target.value)} placeholder={onglet === 'fr' ? 'Bonjour {prenom},\n\n…' : 'Hello {prenom},\n\n…'} />
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          {aideVariables} Mise en forme : une ligne vide entre deux paragraphes, **gras**, [bouton: Libellé | https://…], [lien: Libellé | https://…].
        </p>
      </div>

      {restantes.length > 0 && (
        <p style={{ fontSize: 12, color: '#b45309' }}>
          À remplacer par ton texte avant l’envoi (pas de valeur automatique pour un envoi manuel) : {restantes.map(v => `{${v}}`).join(', ')}
        </p>
      )}

      <button type="button" onClick={() => setApercu(a => !a)} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        {apercu ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {apercu ? 'Masquer l’aperçu' : 'Voir l’aperçu'}
      </button>
      {apercu && <ApercuEmail contenu={contenu} vars={EXEMPLE} />}
    </div>
  )
}

export function ApercuEmail({ contenu, vars, facultatives }: { contenu: ContenuEmail; vars: Record<string, string>; facultatives?: string[] }) {
  return (
    <div className="surface p-4" style={{ background: '#fbf8f3' }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Objet : <strong style={{ color: 'var(--ink)' }}>{rendreObjet(contenu.objet, vars)}</strong></p>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 14.5, lineHeight: 1.7, color: '#1a1816' }} dangerouslySetInnerHTML={{ __html: rendreCorps(contenu.corps, vars, facultatives) }} />
    </div>
  )
}

// Trois façons d'envoyer : tout en français, tout en anglais, ou dans la
// langue choisie par chaque personne.
export function BoutonsEnvoi({
  message,
  envoi,
  onEnvoyer,
  libelle,
}: {
  message: MessageManuel
  envoi: ModeEnvoi | null
  onEnvoyer: (mode: ModeEnvoi) => void
  libelle: string
}) {
  const boutons: { mode: ModeEnvoi; texte: string; aide: string }[] = [
    { mode: 'fr', texte: `Envoyer en FR ${libelle}`, aide: 'Version française pour tout le monde' },
    { mode: 'en', texte: `Envoyer en EN ${libelle}`, aide: 'Version anglaise pour tout le monde' },
    { mode: 'langue', texte: `Envoyer selon la langue choisie ${libelle}`, aide: 'Chaque personne reçoit la version de la langue choisie sur le site (français par défaut) : les deux versions sont nécessaires' },
  ]
  return (
    <div className="flex gap-2 flex-wrap">
      {boutons.map(b => (
        <button
          key={b.mode}
          type="button"
          title={b.aide}
          onClick={() => onEnvoyer(b.mode)}
          disabled={!!envoi || !messagePret(message, b.mode)}
          className={b.mode === 'langue' ? 'btn-brand text-sm py-2 px-4' : 'btn-secondary text-sm py-2 px-4'}
          style={{ opacity: envoi || !messagePret(message, b.mode) ? 0.5 : 1 }}
        >
          {envoi === b.mode ? 'Envoi…' : b.texte}
        </button>
      ))}
    </div>
  )
}
