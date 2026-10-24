'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronRight, CalendarHeart } from 'lucide-react'
import { adminValiderEmailAnniversaire, adminAnnulerValidationEmail } from '@/app/actions/admin'
import { ApercuEmail } from '@/components/admin/ComposeurEmail'
import { corpsAvecMotPersonnel } from '@/lib/modeles-email/rendu'
import type { TacheEmailAnniversaire } from '@/lib/grandes-dates'

const dateLongue = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function quand(jours: number) {
  return jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`
}

// Catégorie « Tâches » de la vue d'ensemble : pour l'instant, la validation
// des e-mails d'anniversaire avant leur envoi.
export default function TachesClient({ taches, tableManquante }: { taches: TacheEmailAnniversaire[]; tableManquante: boolean }) {
  const aValider = taches.filter(t => !t.valideLe).length
  return (
    <div id="taches" className="card p-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="font-mono font-bold" style={{ fontSize: 13, letterSpacing: '.1em', color: 'var(--ink)' }}>TÂCHES</h2>
        <span className={aValider ? 'tag-brand' : 'tag-muted'} style={{ fontSize: 11 }}>
          {aValider ? `${aValider} à valider` : 'Rien à valider'}
        </span>
      </div>
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
  const valide = !!tache.valideLe
  const motModifie = mot.trim() !== tache.mot.trim()
  const destinataire = tache.destinataires[apercu]

  async function valider() {
    setStatut('busy')
    setInfo(null)
    const res = await adminValiderEmailAnniversaire(tache.coupleId, tache.type, tache.anniversaire, mot)
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
            {tache.type === 'mariage' ? 'Anniversaire de mariage' : 'Anniversaire de rencontre'} · {tache.annees} an{tache.annees > 1 ? 's' : ''} le {dateLongue(tache.anniversaire)}
            {' · '}envoi {quand(tache.joursAvantEnvoi)}{tache.joursAvantEnvoi > 1 ? ` (${dateLongue(tache.envoiLe)})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
              Ajouté tel quel dans l’e-mail des deux membres, avant la signature. Écris-le dans la langue du couple
              ({[...new Set(tache.destinataires.map(d => (d.langue === 'en' ? 'anglais' : 'français')))].join(' / ')}).
            </p>
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
                contenu={{ objet: destinataire.contenu.objet, corps: corpsAvecMotPersonnel(destinataire.contenu.corps, mot) }}
                vars={{ ...Object.fromEntries(Object.entries(destinataire.vars).map(([k, v]) => [k, String(v ?? '')])), mot_personnel: mot }}
                facultatives={destinataire.facultatives}
              />
            )
          )}

          {info && <p style={{ fontSize: 12, color: info.ok ? 'var(--sage)' : '#dc2626' }}>{info.texte}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {(!valide || motModifie) && (
              <button onClick={valider} disabled={statut === 'busy'} className="btn-brand text-sm py-2 px-4 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {statut === 'busy' ? 'Un instant…' : valide ? 'Valider avec ce mot' : tache.joursAvantEnvoi === 0 ? 'Valider et envoyer maintenant' : 'Valider l’envoi'}
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
