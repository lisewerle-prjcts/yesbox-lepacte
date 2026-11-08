'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronRight, CalendarHeart } from 'lucide-react'
import { adminValiderEmailAnniversaire, adminAnnulerValidationEmail, adminEnvoyerMaintenant } from '@/app/actions/admin'
import type { SortePrevue } from '@/lib/rappels-email'
import { ApercuEmail } from '@/components/admin/ComposeurEmail'
import { corpsAvecMotPersonnel } from '@/lib/modeles-email/rendu'
import type { ContenuPerso, TacheEmailAnniversaire } from '@/lib/grandes-dates'
import type { ContenuEmail } from '@/lib/modeles-email/catalogue'
import AvisTaches, { type AvisAdmin } from './AvisTaches'

const dateLongue = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function quand(jours: number) {
  return jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`
}

// Catégorie « Tâches » de la vue d'ensemble : les avis à publier, les
// relances des 3 prochains jours, et la validation des e-mails
// d'anniversaire avant leur envoi.
// Relance qui partira avec la tâche quotidienne dans les 3 prochains jours.
export interface RelanceAVenir { sorte: SortePrevue; cle: string | null; coupleId: string; couple: string; email: string; detail: string; destinataires: string[]; le: string }

const jourRelance = (iso: string) => {
  const jour = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const ecart = Math.round((jour(new Date(iso)) - jour(new Date())) / (24 * 60 * 60 * 1000))
  const date = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return ecart <= 0 ? `aujourd’hui (${date})` : ecart === 1 ? `demain (${date})` : date
}

export default function TachesClient({ taches, tableManquante, avis, avisTableManquante, relances = [] }: { taches: TacheEmailAnniversaire[]; tableManquante: boolean; avis: AvisAdmin[]; avisTableManquante: boolean; relances?: RelanceAVenir[] }) {
  const aValider = taches.filter(t => !t.valideLe).length + avis.filter(a => a.statut === 'en_attente').length
  return (
    <div id="taches" className="card p-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="font-mono font-bold" style={{ fontSize: 13, letterSpacing: '.1em', color: 'var(--ink)' }}>TÂCHES</h2>
        <span className={aValider ? 'tag-brand' : 'tag-muted'} style={{ fontSize: 11 }}>
          {aValider ? `${aValider} à valider` : 'Rien à valider'}
        </span>
      </div>
      <AvisTaches avis={avis} tableManquante={avisTableManquante} />

      <h3 className="font-semibold mb-1" style={{ fontSize: 14, color: 'var(--ink)' }}>Relances, demandes d’avis et parrainage des 3 prochains jours</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
        Rien à valider : ils partent seuls avec la tâche du matin (vers 8 h–9 h, heure de Paris), ou tout de suite avec « Envoyer maintenant ». Une réponse enregistrée d’ici là annule une relance d’inactivité ; un avis laissé d’ici là annule la demande d’avis.
      </p>
      {relances.length === 0 ? (
        <p className="mb-6" style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun e-mail prévu dans les 3 prochains jours.</p>
      ) : (
        <div className="overflow-x-auto mb-6">
          <table className="w-full" style={{ fontSize: 12.5, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                <th className="py-1.5 pr-3">Quand</th>
                <th className="py-1.5 pr-3">Couple</th>
                <th className="py-1.5 pr-3">E-mail</th>
                <th className="py-1.5 pr-3">Destinataires</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {relances.map(r => (
                <tr key={`${r.coupleId}-${r.email}`} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap' }}>{jourRelance(r.le)}</td>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink-2)' }}>{r.couple}</td>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink-2)' }}>{r.email}<div style={{ color: 'var(--muted)', fontSize: 11.5 }}>{r.detail}</div></td>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--muted)' }}>{r.destinataires.join(', ')}</td>
                  <td className="py-1.5" style={{ whiteSpace: 'nowrap' }}><BoutonEnvoyerMaintenant relance={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="font-semibold mb-1" style={{ fontSize: 14, color: 'var(--ink)' }}>E-mails d’anniversaire</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        E-mails d’anniversaire des 30 prochains jours : relis-les, ajoute un mot si tu veux, puis valide. Sans validation, ils ne partent pas
        (un rappel t’est envoyé 3 jours avant, la veille et le jour même).
      </p>
      {tableManquante && (
        <p className="mb-3" style={{ fontSize: 12, color: '#dc2626' }}>
          La table validations_emails n’existe pas encore : lance la commande SQL de la dernière mise à jour dans Supabase pour pouvoir valider.
        </p>
      )}
      {taches.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun e-mail d’anniversaire prévu dans les 30 prochains jours.</p>
      ) : (
        <div className="space-y-3">
          {taches.map(t => <Tache key={`${t.coupleId}-${t.type}-${t.anniversaire}`} tache={t} />)}
        </div>
      )}
    </div>
  )
}

function Tache({ tache }: { tache: TacheEmailAnniversaire }) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(!tache.valideLe && tache.joursAvantEnvoi <= 3)
  const [mot, setMot] = useState(tache.mot)
  const [apercu, setApercu] = useState(0)
  const [statut, setStatut] = useState<'idle' | 'busy'>('idle')
  const [info, setInfo] = useState<{ ok: boolean; texte: string } | null>(null)
  const [perso, setPerso] = useState<ContenuPerso>(tache.contenuPerso)
  const [editer, setEditer] = useState(Object.keys(tache.contenuPerso).length > 0)
  const valide = !!tache.valideLe
  const persoModifie = JSON.stringify(perso) !== JSON.stringify(tache.contenuPerso)
  const motModifie = mot.trim() !== tache.mot.trim() || persoModifie
  const destinataire = tache.destinataires[apercu]
  // Langues des membres du couple, et texte du modèle pour chacune.
  const langues = [...new Set(tache.destinataires.map(d => d.langue))]
  const texteModele = (l: 'fr' | 'en') => tache.destinataires.find(d => d.langue === l)!.contenu
  const texte = (l: 'fr' | 'en'): ContenuEmail => perso[l] ?? texteModele(l)

  function modifierTexte(l: 'fr' | 'en', champ: keyof ContenuEmail, valeur: string) {
    setPerso(p => ({ ...p, [l]: { ...texte(l), [champ]: valeur } }))
  }

  async function valider() {
    setStatut('busy')
    setInfo(null)
    // Seules les langues réellement modifiées sont gardées.
    const modifie: ContenuPerso = {}
    for (const l of langues) {
      const c = perso[l]
      if (c && (c.objet !== texteModele(l).objet || c.corps !== texteModele(l).corps)) modifie[l] = c
    }
    const res = await adminValiderEmailAnniversaire(tache.coupleId, tache.type, tache.anniversaire, mot, modifie)
    setStatut('idle')
    if (res.error) { setInfo({ ok: false, texte: res.error }); return }
    setInfo({ ok: true, texte: res.envoyes ? `Validé et envoyé (${res.envoyes} e-mail${res.envoyes > 1 ? 's' : ''}).` : `Validé : il partira ${quand(tache.joursAvantEnvoi)}, le ${dateLongue(tache.envoiLe)}.` })
    router.refresh()
  }

  async function annuler() {
    setStatut('busy')
    setInfo(null)
    const res = await adminAnnulerValidationEmail(tache.coupleId, tache.type, tache.anniversaire)
    setStatut('idle')
    if (res.error) { setInfo({ ok: false, texte: res.error }); return }
    router.refresh()
  }

  return (
    <div className="surface p-4" style={{ borderLeft: `3px solid ${valide ? 'var(--sage)' : '#d97706'}` }}>
      <button type="button" onClick={() => setOuvert(o => !o)} className="w-full flex items-start justify-between gap-3 text-left">
        <div>
          <p style={{ fontSize: 14, color: 'var(--ink)' }}>
            <CalendarHeart className="w-3.5 h-3.5 inline mr-1" style={{ color: 'var(--brand)' }} />
            <strong>Couple {tache.numero}</strong>{tache.nomCouple ? ` — ${tache.nomCouple}` : ''}
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            {tache.type === 'mariage' ? 'Anniversaire de mariage' : 'Anniversaire de couple'} · {tache.annees} an{tache.annees > 1 ? 's' : ''} le {dateLongue(tache.anniversaire)}
            {' · '}envoi {quand(tache.joursAvantEnvoi)}{tache.joursAvantEnvoi > 1 ? ` (${dateLongue(tache.envoiLe)})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span style={{ fontSize: 11, fontWeight: 600, color: valide ? 'var(--sage)' : '#d97706' }}>
            {valide ? '✓ Validé' : 'À valider'}
          </span>
          {ouvert ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {ouvert && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="flabel">Mot personnel (facultatif)</label>
            <textarea
              className="field"
              rows={3}
              value={mot}
              onChange={e => setMot(e.target.value)}
              placeholder="Ex : Toute l’équipe YES BOX est heureuse de faire partie de votre histoire !"
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Ajouté tel quel dans l’e-mail des deux membres, avant la signature (pour changer tout le texte, utilise « Modifier le texte » ci-dessous). Écris-le dans la langue du couple
              ({[...new Set(tache.destinataires.map(d => (d.langue === 'en' ? 'anglais' : 'français')))].join(' / ')}).
            </p>
          </div>

          <div>
            {!editer ? (
              <button type="button" onClick={() => setEditer(true)} className="text-xs" style={{ color: 'var(--brand)' }}>
                ✎ Modifier le texte de cet e-mail (pour ce couple seulement)
              </button>
            ) : (
              <div className="space-y-3 surface p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p style={{ fontSize: 12, color: 'var(--ink-2)' }}><strong>Texte pour ce couple seulement</strong> — le modèle commun (Messages & e-mails) ne change pas.</p>
                  <button type="button" onClick={() => { setPerso({}); setEditer(false) }} className="text-xs" style={{ color: 'var(--muted)' }}>
                    Revenir au texte du modèle
                  </button>
                </div>
                {langues.map(l => (
                  <div key={l} className="space-y-2">
                    {langues.length > 1 && <p className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--muted)' }}>{l === 'fr' ? 'VERSION FRANÇAISE' : 'VERSION ANGLAISE'}</p>}
                    <input type="text" className="field" value={texte(l).objet} onChange={e => modifierTexte(l, 'objet', e.target.value)} />
                    <textarea className="field font-mono" rows={10} style={{ fontSize: 12.5 }} value={texte(l).corps} onChange={e => modifierTexte(l, 'corps', e.target.value)} />
                  </div>
                ))}
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Garde les variables entre accolades ({'{prenom}'}, {'{annees}'}…) : elles sont remplacées pour chaque membre. Une ligne vide entre deux paragraphes, **gras**.
                </p>
              </div>
            )}
          </div>

          {tache.destinataires.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {tache.destinataires.map((d, i) => (
                <button key={i} type="button" onClick={() => setApercu(i)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: apercu === i ? 'var(--brand)' : 'var(--paper)', color: apercu === i ? 'white' : 'var(--ink-2)', border: '1px solid var(--line)' }}>
                  E-mail de {d.prenom} ({d.langue === 'en' ? 'EN' : 'FR'})
                </button>
              ))}
            </div>
          )}
          {destinataire && (
            destinataire.exclu ? (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{destinataire.prenom} a désactivé les e-mails de rappel : ne recevra pas cet e-mail.</p>
            ) : (
              <ApercuEmail
                contenu={{ objet: texte(destinataire.langue).objet, corps: corpsAvecMotPersonnel(texte(destinataire.langue).corps, mot) }}
                vars={{ ...Object.fromEntries(Object.entries(destinataire.vars).map(([k, v]) => [k, String(v ?? '')])), mot_personnel: mot }}
                facultatives={destinataire.facultatives}
              />
            )
          )}

          {info && <p style={{ fontSize: 12, color: info.ok ? 'var(--sage)' : '#dc2626' }}>{info.texte}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {(!valide || motModifie) && (
              <button onClick={valider} disabled={statut === 'busy'} className="btn-brand text-sm py-2 px-4 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {statut === 'busy' ? 'Un instant…' : valide ? 'Valider avec ces modifications' : tache.joursAvantEnvoi === 0 ? 'Valider et envoyer maintenant' : 'Valider l’envoi'}
              </button>
            )}
            {valide && (
              <button onClick={annuler} disabled={statut === 'busy'} className="text-xs" style={{ color: 'var(--muted)' }}>
                Annuler la validation (l’e-mail ne partira pas)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Envoie tout de suite un e-mail de la liste « à venir » : il ne repartira
// pas avec la tâche du matin.
function BoutonEnvoyerMaintenant({ relance }: { relance: RelanceAVenir }) {
  const router = useRouter()
  const [statut, setStatut] = useState<'idle' | 'busy' | 'ok'>('idle')
  const [erreur, setErreur] = useState<string | null>(null)

  async function envoyer() {
    if (!window.confirm(`Envoyer maintenant « ${relance.email} » au ${relance.couple} (${relance.destinataires.join(', ')}) ?`)) return
    setStatut('busy')
    setErreur(null)
    try {
      const res = await adminEnvoyerMaintenant(relance.sorte, relance.coupleId, relance.cle ?? undefined)
      if ('error' in res && res.error) { setErreur(res.error); setStatut('idle'); return }
      setStatut('ok')
      router.refresh()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
      setStatut('idle')
    }
  }

  if (statut === 'ok') return <span style={{ fontSize: 12, color: 'var(--sage)' }}><Check className="w-3.5 h-3.5 inline" /> Envoyé</span>
  return (
    <div>
      <button type="button" onClick={envoyer} disabled={statut === 'busy'} className="btn-secondary text-xs py-1 px-2.5">
        {statut === 'busy' ? 'Envoi…' : 'Envoyer maintenant'}
      </button>
      {erreur && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4, maxWidth: 220, whiteSpace: 'normal' }}>{erreur}</p>}
    </div>
  )
}
