'use client'

import { useState } from 'react'
import { Check, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { adminSaveModeleEmail, adminResetModeleEmail } from '@/app/actions/admin'
import { ApercuEmail } from '@/components/admin/ComposeurEmail'
import type { ContenuEmail, FamilleEmail } from '@/lib/modeles-email/catalogue'

type Langue = 'fr' | 'en'

interface Modele {
  cle: string
  famille: FamilleEmail
  nom: string
  quand: string
  rappel: boolean
  etiquette: string | null
  facultatives: string[]
  obligatoires: string[]
  variables: { nom: string; description: string }[]
  defaut: Record<Langue, ContenuEmail>
  actuel: Record<Langue, ContenuEmail>
}

// Valeurs d'exemple pour l'aperçu.
const EXEMPLE: Record<string, string> = {
  prenom: 'Camille', partenaire: 'Sacha', code: 'A1B2C3', lien: 'https://yesbox-lepacte.fr', lien_pacte: 'https://yesbox-lepacte.fr/journal',
  module: 'Nos valeurs', numero: '3', total: '10', date: '12 mars 2027', quand: 'le 12 mars 2027', jours: '12 jours',
  rappel_rdv: 'Prochain rendez-vous annuel : le 12 mars 2027.', precision_rdv: ', le 12 mars 2027',
  phrase_abonnement: 'À la fin de votre mois d’abonnement, le 12 mars 2027, vous passerez automatiquement à l’abonnement annuel.',
  mois: '6 mois', mot_de_passe: 'k3Rm-92xa', annees: '5 ans', matiere: 'bois', autour_matiere: 'du bois', noces: 'noces de bois',
  idees_cadeau: 'un objet sculpté, une boîte à souvenirs gravée, ou un arbre à planter ensemble', invite_par: 'Camille', mot_personnel: 'Un petit mot de l’équipe : merci de faire partie de l’aventure YES BOX !',
}

const egal = (a: ContenuEmail, b: ContenuEmail) => a.objet === b.objet && a.corps === b.corps

export default function EditeurModeles({ familles, modeles }: { familles: { cle: FamilleEmail; nom: string; description: string }[]; modeles: Modele[] }) {
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({})
  return (
    <div className="space-y-4">
      {familles.map(f => {
        const liste = modeles.filter(m => m.famille === f.cle)
        const ouverte = !!ouvertes[f.cle]
        const modifies = liste.filter(m => !egal(m.actuel.fr, m.defaut.fr) || !egal(m.actuel.en, m.defaut.en)).length
        return (
          <div key={f.cle} className="card">
            <button type="button" onClick={() => setOuvertes(o => ({ ...o, [f.cle]: !ouverte }))} className="w-full flex items-center justify-between gap-3 p-5 text-left">
              <div>
                <h2 className="font-semibold" style={{ fontSize: 16, color: 'var(--ink)' }}>{f.nom}</h2>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{f.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {liste.length} e-mail{liste.length > 1 ? 's' : ''}{modifies ? ` · ${modifies} modifié${modifies > 1 ? 's' : ''}` : ''}
                {ouverte ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </button>
            {ouverte && (
              <div className="px-5 pb-5 space-y-4">
                {liste.map(m => <CarteModele key={m.cle} modele={m} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CarteModele({ modele }: { modele: Modele }) {
  const [ouvert, setOuvert] = useState(false)
  const [langue, setLangue] = useState<Langue>('fr')
  const [valeurs, setValeurs] = useState(modele.actuel)
  const [enregistres, setEnregistres] = useState(modele.actuel)
  const [statut, setStatut] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [erreur, setErreur] = useState<string | null>(null)
  const contenu = valeurs[langue]
  const modifie = !egal(enregistres.fr, modele.defaut.fr) || !egal(enregistres.en, modele.defaut.en)

  function modifier(champ: keyof ContenuEmail, v: string) {
    setValeurs(x => ({ ...x, [langue]: { ...x[langue], [champ]: v } }))
  }

  async function enregistrer() {
    setStatut('saving')
    setErreur(null)
    const res = await adminSaveModeleEmail(modele.cle, langue, contenu)
    if (res.error) { setErreur(res.error); setStatut('idle'); return }
    setEnregistres(x => ({ ...x, [langue]: contenu }))
    setStatut('saved')
    setTimeout(() => setStatut('idle'), 2000)
  }

  async function revenirAuTexteInitial() {
    if (!window.confirm(`Revenir au texte d’origine de la version ${langue === 'fr' ? 'française' : 'anglaise'} ?`)) return
    setErreur(null)
    const res = await adminResetModeleEmail(modele.cle, langue)
    if (res.error || !res.contenu) { setErreur(res.error ?? 'Erreur'); return }
    setValeurs(x => ({ ...x, [langue]: res.contenu! }))
    setEnregistres(x => ({ ...x, [langue]: res.contenu! }))
  }

  return (
    <div className="surface p-4">
      <button type="button" onClick={() => setOuvert(o => !o)} className="w-full flex items-start justify-between gap-3 text-left">
        <div>
          <p className="font-semibold" style={{ fontSize: 14, color: 'var(--ink)' }}>
            {modele.nom}
            {modifie && <span className="tag-brand ml-2" style={{ fontSize: 10 }}>modifié</span>}
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>{modele.quand}</p>
        </div>
        {ouvert ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
      </button>

      {ouvert && (
        <div className="mt-4 space-y-3">
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            <p className="mb-1"><strong>Variables :</strong></p>
            <ul className="space-y-0.5">
              {modele.variables.map(v => (
                <li key={v.nom}>
                  <code style={{ background: 'var(--cream-2)', padding: '1px 5px', borderRadius: 4 }}>{`{${v.nom}}`}</code> {v.description}
                  {modele.obligatoires.includes(v.nom) && <em style={{ color: 'var(--brand)' }}> — obligatoire</em>}
                  {modele.facultatives.includes(v.nom) && <em style={{ color: 'var(--muted)' }}> — peut être vide : son paragraphe n’est alors pas affiché</em>}
                </li>
              ))}
            </ul>
            {modele.etiquette && <p className="mt-1">Mot-clé noté dans l’historique des e-mails du couple : <strong>[{modele.etiquette}]</strong></p>}
            {modele.rappel && <p className="mt-1" style={{ color: 'var(--muted)' }}>Rappel : le lien « Ne plus recevoir ces rappels » est ajouté automatiquement en bas.</p>}
          </div>

          <div className="flex gap-1">
            {(['fr', 'en'] as const).map(l => (
              <button key={l} type="button" onClick={() => setLangue(l)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: langue === l ? 'var(--brand)' : 'var(--paper)', color: langue === l ? 'white' : 'var(--ink-2)', border: '1px solid var(--line)' }}>
                {l === 'fr' ? 'Français' : 'Anglais'}
              </button>
            ))}
          </div>

          <div>
            <label className="flabel">Objet</label>
            <input type="text" className="field" value={contenu.objet} onChange={e => modifier('objet', e.target.value)} />
          </div>
          <div>
            <label className="flabel">Message</label>
            <textarea className="field font-mono" rows={12} style={{ fontSize: 12.5 }} value={contenu.corps} onChange={e => modifier('corps', e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Une ligne vide entre deux paragraphes · **gras** · [bouton: Libellé | {'{lien}'}] · [lien: Libellé | {'{lien}'}] · [code: {'{code}'}] · « petit: » en début de paragraphe pour un texte en petit.
            </p>
          </div>

          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Aperçu (avec des valeurs d’exemple) :</p>
          <ApercuEmail contenu={contenu} vars={EXEMPLE} facultatives={modele.facultatives} />

          {erreur && <p style={{ fontSize: 12, color: '#dc2626' }}>{erreur}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={enregistrer} disabled={statut === 'saving' || egal(contenu, enregistres[langue])} className="btn-brand py-2 px-4 text-sm" style={{ opacity: egal(contenu, enregistres[langue]) ? 0.5 : 1 }}>
              {statut === 'saved' ? <><Check className="w-3.5 h-3.5" /> Enregistré</> : statut === 'saving' ? 'Enregistrement…' : `Enregistrer la version ${langue === 'fr' ? 'française' : 'anglaise'}`}
            </button>
            {!egal(enregistres[langue], modele.defaut[langue]) && (
              <button onClick={revenirAuTexteInitial} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                <RotateCcw className="w-3 h-3" /> Revenir au texte d’origine
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
