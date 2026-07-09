'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Star, RotateCcw } from 'lucide-react'
import { noterConnivence, recommencerModule } from '@/app/actions/modules'
import { sauvegarderJournal } from '@/app/actions/journal'
import { questionTexte } from '@/lib/modules-data'
import type { ModuleInfo, Module, Reponse, Question } from '@/types'

interface HistoriqueCycle {
  cycle: number
  revealedAt: string | null
  myScore: number | null
  partnerScore: number | null
}

interface Props {
  moduleInfo: ModuleInfo
  titre: string
  moduleData: Module
  mesReponses: Reponse[]
  reponsesPartner: Reponse[]
  myScore: number | null
  partnerScore: number | null
  myName: string | null
  partnerName: string | null
  role?: string | null
  coupleId: string
  journalContenu: string | null
  historique: HistoriqueCycle[]
}

const CONNIVENCE_VERDICTS: Record<number, [string, string]> = {
  1: ["Vous vous découvrez encore", "Tout reste à explorer — et c'est une chance. Le plus beau est devant vous."],
  2: ["Des surprises de part et d'autre", "Vous vous connaissez, mais l'autre garde des jardins secrets."],
  3: ["Vous êtes sur la même longueur d'onde", "De belles convergences, quelques angles morts à apprivoiser."],
  4: ["Vous vous surprenez encore", "Une vraie complicité, avec ce qu'il faut de mystère pour ne jamais s'ennuyer."],
  5: ["Vous vous connaissez par cœur", "Une connivence rare. Prenez-en soin comme d'un trésor."],
}

function fmtAnswer(q: Question, val: string | undefined): string | null {
  if (val === undefined || val === '') return null
  if (q.type === 'text') return val
  if (q.type === 'choix' && q.options) return q.options[parseInt(val)] ?? val
  if (q.type === 'choix_multiple' && q.options) {
    return val.split('||').map(i => q.options![parseInt(i)]).filter(Boolean).join(', ')
  }
  if (q.type === 'echelle') return `${val} / ${q.max ?? 10}`
  return val
}

function answersMatch(q: Question, a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (q.type === 'choix') return a === b
  if (q.type === 'echelle') return Math.abs(parseInt(a) - parseInt(b)) <= 1
  if (q.type === 'choix_multiple') {
    const A = a.split('||'), B = b.split('||')
    return A.some(x => B.includes(x))
  }
  return false
}

function StarRow({ label, score }: { label: string; score: number | null }) {
  if (!score) return null
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      <span style={{ fontSize: 13, color: 'var(--dark-muted)', minWidth: 90, textAlign: 'right' }}>{label}</span>
      <span style={{ color: 'var(--brand)', letterSpacing: 2 }}>{'★'.repeat(score)}{'☆'.repeat(5 - score)}</span>
    </div>
  )
}

export default function RevelationClient({ moduleInfo, titre, moduleData, mesReponses, reponsesPartner, myScore, partnerScore, myName, partnerName, role, coupleId, journalContenu, historique }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restarting, setRestarting] = useState(false)
  const [monScore, setMonScore] = useState<number>(myScore ?? 0)
  const [hovered, setHovered] = useState(0)
  const [journalText, setJournalText] = useState(journalContenu ?? '')
  const [journalSaved, setJournalSaved] = useState(false)
  const [showHistorique, setShowHistorique] = useState(false)

  const dejaNote = myScore !== null
  const tousLesDeuxOntNote = myScore !== null && partnerScore !== null

  const myMap: Record<string, string> = {}
  mesReponses.forEach(r => { if (r.valeur) myMap[r.question_slug] = r.valeur })
  const partnerMap: Record<string, string> = {}
  reponsesPartner.forEach(r => { if (r.valeur) partnerMap[r.question_slug] = r.valeur })

  async function valider() {
    if (!monScore) return
    startTransition(async () => {
      if (journalText.trim()) {
        await sauvegarderJournal(coupleId, moduleInfo.slug, journalText)
      }
      await noterConnivence(moduleData.id, moduleInfo.slug, monScore)
      router.refresh()
    })
  }

  async function saveJournal() {
    if (!journalText.trim()) return
    await sauvegarderJournal(coupleId, moduleInfo.slug, journalText)
    setJournalSaved(true)
    setTimeout(() => setJournalSaved(false), 2000)
  }

  async function onRecommencer() {
    setRestarting(true)
    await recommencerModule(moduleInfo.slug)
  }

  const displayScore = dejaNote ? monScore : (hovered || monScore)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'var(--font-geist)' }}>
      {/* Top */}
      <div style={{ borderBottom: '1px solid var(--dark-line)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 860, margin: '0 auto' }}>
        <Link href="/tableau-de-bord" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--dark-muted)' }}>
          <ArrowLeft className="w-4 h-4" />Tableau de bord
        </Link>
        <div className="font-mono text-xs font-bold" style={{ color: 'var(--dark-muted)', letterSpacing: '.1em' }}>
          RÉVÉLATION · {titre.toUpperCase()}{moduleData.cycle > 1 ? ` · CYCLE ${moduleData.cycle}` : ''}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Intro */}
        <div className="text-center mb-12">
          <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}>Vos réponses, enfin réunies</div>
          <h1 className="font-serif" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: 'var(--dark-paper)', lineHeight: 1.1, marginBottom: 14 }}>
            Moment de vérité ✦
          </h1>
          <p style={{ color: 'var(--dark-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
            Prenez le temps de lire ce que l'autre a écrit. Sans juger. C'est ça, se choisir.
          </p>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-8">
          {moduleInfo.questions.map((q, i) => {
            const myVal = myMap[q.slug]
            const partnerVal = partnerMap[q.slug]
            const match = answersMatch(q, myVal, partnerVal)
            const myFmt = fmtAnswer(q, myVal)
            const partnerFmt = fmtAnswer(q, partnerVal)

            return (
              <div key={q.slug}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark-muted)', marginBottom: 14 }}>{questionTexte(q, role)}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div style={{ background: match ? 'rgba(197,37,110,.12)' : 'var(--dark-2)', borderRadius: 'var(--r)', padding: '16px 18px', border: `1px solid ${match ? 'rgba(197,37,110,.3)' : 'var(--dark-line)'}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="av av-c" style={{ width: 26, height: 26, fontSize: 11 }}>{(myName || 'M')[0]}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-muted)' }}>{myName || 'Toi'}</span>
                    </div>
                    <p style={{ fontSize: 14, color: myFmt ? 'var(--dark-paper)' : 'var(--dark-muted)', fontStyle: myFmt ? 'normal' : 'italic', lineHeight: 1.6 }}>
                      {myFmt || '— pas de réponse —'}
                    </p>
                  </div>
                  <div style={{ background: match ? 'rgba(197,37,110,.12)' : 'var(--dark-2)', borderRadius: 'var(--r)', padding: '16px 18px', border: `1px solid ${match ? 'rgba(197,37,110,.3)' : 'var(--dark-line)'}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="av av-a" style={{ width: 26, height: 26, fontSize: 11 }}>{(partnerName || 'P')[0]}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-muted)' }}>{partnerName || 'Partenaire'}</span>
                    </div>
                    <p style={{ fontSize: 14, color: partnerFmt ? 'var(--dark-paper)' : 'var(--dark-muted)', fontStyle: partnerFmt ? 'normal' : 'italic', lineHeight: 1.6 }}>
                      {partnerFmt || '— pas de réponse —'}
                    </p>
                  </div>
                </div>
                {match && (
                  <p className="text-center mt-2" style={{ fontSize: 12, color: 'var(--brand-soft)' }}>
                    ★ Vous êtes sur la même longueur d'onde
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Connivence */}
        <div className="text-center mt-14" style={{ borderTop: '1px solid var(--dark-line)', paddingTop: 48 }}>
          <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}>Score de connivence</div>
          <h2 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 700, color: 'var(--dark-paper)' }}>
            {dejaNote ? 'Ta note pour ce module' : 'À toi de jouer — note ta connivence'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--dark-muted)', marginBottom: 28 }}>
            {dejaNote
              ? (tousLesDeuxOntNote ? 'Vous avez chacun·e évalué à quel point vous vous êtes reconnus.' : `En attente de la note de ${partnerName || 'ton/ta partenaire'}…`)
              : "Touche une étoile : à quel point t'es-tu reconnu·e dans les réponses de l'autre ?"}
          </p>

          {/* Étoiles — ma note */}
          <div className="flex justify-center gap-3 mb-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button"
                onClick={() => !dejaNote && setMonScore(s)}
                onMouseEnter={() => !dejaNote && setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                style={{ background: 'none', border: 'none', cursor: dejaNote ? 'default' : 'pointer', padding: 4 }}>
                <Star
                  className="w-10 h-10 transition-all"
                  style={{
                    fill: s <= displayScore ? 'var(--brand)' : 'transparent',
                    stroke: s <= displayScore ? 'var(--brand)' : 'var(--dark-muted)',
                    transform: s <= displayScore ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              </button>
            ))}
          </div>
          {!dejaNote && <p style={{ fontSize: 11, color: 'var(--dark-muted)', marginBottom: 10 }}>Toi</p>}

          {displayScore > 0 && CONNIVENCE_VERDICTS[displayScore] && !dejaNote && (
            <div className="mb-8">
              <p className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark-paper)', marginBottom: 6 }}>
                {CONNIVENCE_VERDICTS[displayScore][0]}
              </p>
              <p style={{ fontSize: 14, color: 'var(--dark-muted)' }}>{CONNIVENCE_VERDICTS[displayScore][1]}</p>
            </div>
          )}

          {/* Une fois notés tous les deux : les deux scores côte à côte */}
          {tousLesDeuxOntNote && (
            <div className="mb-8 mt-2">
              <StarRow label={myName || 'Toi'} score={myScore} />
              <StarRow label={partnerName || 'Partenaire'} score={partnerScore} />
            </div>
          )}

          {/* Journal */}
          <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: 24, marginBottom: 28, textAlign: 'left', border: '1px solid var(--dark-line)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-muted)', display: 'block', marginBottom: 10 }}>
              Votre conclusion — en quelques mots (optionnel)
            </label>
            <textarea
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              placeholder="Ce qu'on retient, ce qu'on a découvert, ce qu'on veut garder…"
              rows={3}
              style={{ width: '100%', background: 'var(--dark)', border: '1.5px solid var(--dark-line)', borderRadius: 'var(--r-sm)', padding: '12px 16px', color: 'var(--dark-paper)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {moduleInfo.outroTexte && tousLesDeuxOntNote && (
            <p style={{ fontSize: 14, color: 'var(--dark-muted)', marginBottom: 24, whiteSpace: 'pre-wrap' }}>{moduleInfo.outroTexte}</p>
          )}

          {dejaNote ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              {journalText && (
                <button onClick={saveJournal} className="btn-ghost" style={{ borderColor: 'var(--dark-line)', color: 'var(--dark-paper)' }}>
                  {journalSaved ? '✓ Sauvegardé' : 'Sauvegarder la conclusion'}
                </button>
              )}
              <Link href="/tableau-de-bord" className="btn-ghost" style={{ borderColor: 'var(--dark-line)', color: 'var(--dark-paper)' }}>
                Retour au tableau de bord
              </Link>
              {tousLesDeuxOntNote && (
                <button onClick={onRecommencer} disabled={restarting} className="btn-ghost" style={{ borderColor: 'var(--dark-line)', color: 'var(--dark-paper)' }}>
                  <RotateCcw className="w-4 h-4" />
                  {restarting ? 'Préparation…' : 'Recommencer le module'}
                </button>
              )}
            </div>
          ) : (
            <button onClick={valider} disabled={!monScore || isPending}
              className="btn-brand lg"
              style={{ opacity: !monScore ? .4 : 1 }}>
              {isPending ? 'Enregistrement…' : 'Valider ma note'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Historique des cycles précédents */}
          {historique.length > 0 && (
            <div className="mt-16 text-left" style={{ borderTop: '1px solid var(--dark-line)', paddingTop: 32 }}>
              <button onClick={() => setShowHistorique(v => !v)} className="flex items-center gap-2 mx-auto mb-4"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-muted)', fontSize: 13, fontWeight: 600 }}>
                {moduleInfo.annuel ? 'Vos bilans des années précédentes' : 'Vos réponses précédentes'} ({historique.length}) {showHistorique ? '▲' : '▼'}
              </button>
              {showHistorique && (
                <div className="flex flex-col gap-3">
                  {historique.map(h => (
                    <div key={h.cycle} className="flex items-center justify-between flex-wrap gap-2" style={{ background: 'var(--dark-2)', borderRadius: 'var(--r-sm)', padding: '14px 18px', border: '1px solid var(--dark-line)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-paper)' }}>
                          {moduleInfo.annuel ? `Bilan ${h.cycle}` : `Cycle ${h.cycle}`}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--dark-muted)' }}>
                          {h.revealedAt ? new Date(h.revealedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-4" style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--dark-muted)' }}>{myName || 'Toi'} : <span style={{ color: 'var(--brand)' }}>{h.myScore ? '★'.repeat(h.myScore) : '—'}</span></span>
                        <span style={{ color: 'var(--dark-muted)' }}>{partnerName || 'Partenaire'} : <span style={{ color: 'var(--brand)' }}>{h.partnerScore ? '★'.repeat(h.partnerScore) : '—'}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
