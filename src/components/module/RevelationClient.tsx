'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { sauvegarderConclusion } from '@/app/actions/journal'
import EditableText from '@/components/edit-mode/EditableText'
import type { ModuleInfo, Module, Reponse, Question } from '@/types'

interface ConclusionRow { question_slug: string; valeur: string | null }

interface Props {
  moduleInfo: ModuleInfo
  moduleData: Module
  mesReponses: Reponse[]
  reponsesPartner: Reponse[]
  myName: string | null
  partnerName: string | null
  coupleId: string
  maConclusion: ConclusionRow[]
  conclusionPartenaire: ConclusionRow[]
}

function fmtAnswer(q: Question, val: string | undefined): string | null {
  if (val === undefined || val === '') return null
  if (q.type === 'choix' && q.options) return q.options[parseInt(val)] ?? val
  if (q.type === 'choix_multiple' && q.options) {
    return val.split('||').map(i => q.options![parseInt(i)]).filter(Boolean).join(', ')
  }
  if (q.type === 'echelle') return `${val} / ${q.max ?? 10}`
  return val
}

function getConclusion(rows: ConclusionRow[], slug: 'apprentissage' | 'surprise'): string {
  return rows.find(r => r.question_slug === slug)?.valeur ?? ''
}

export default function RevelationClient({ moduleInfo, moduleData, mesReponses, reponsesPartner, myName, partnerName, coupleId, maConclusion, conclusionPartenaire }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [apprentissage, setApprentissage] = useState(() => getConclusion(maConclusion, 'apprentissage'))
  const [surprise, setSurprise] = useState(() => getConclusion(maConclusion, 'surprise'))
  const [saved, setSaved] = useState(() => !!(getConclusion(maConclusion, 'apprentissage') && getConclusion(maConclusion, 'surprise')))
  const [revealed, setRevealed] = useState(moduleData.revealed)

  const myMap: Record<string, string> = {}
  mesReponses.forEach(r => { if (r.valeur) myMap[r.question_slug] = r.valeur })
  const partnerMap: Record<string, string> = {}
  reponsesPartner.forEach(r => { if (r.valeur) partnerMap[r.question_slug] = r.valeur })

  const partnerApprentissage = getConclusion(conclusionPartenaire, 'apprentissage')
  const partnerSurprise = getConclusion(conclusionPartenaire, 'surprise')
  const partnerConclusionDone = !!(partnerApprentissage && partnerSurprise)

  const canSave = apprentissage.trim().length > 0 && surprise.trim().length > 0

  async function enregistrer() {
    if (!canSave) return
    startTransition(async () => {
      const result = await sauvegarderConclusion(coupleId, moduleData.id, moduleInfo.slug, apprentissage, surprise)
      if (result.success) {
        setSaved(true)
        if (result.sealed) setRevealed(true)
        router.refresh()
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'var(--font-geist)' }}>
      {/* Top */}
      <div style={{ borderBottom: '1px solid var(--dark-line)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 860, margin: '0 auto' }}>
        <Link href="/tableau-de-bord" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--dark-muted)' }}>
          <ArrowLeft className="w-4 h-4" /><EditableText id="revelation.retour">Tableau de bord</EditableText>
        </Link>
        <div className="font-mono text-xs font-bold" style={{ color: 'var(--dark-muted)', letterSpacing: '.1em' }}>
          <EditableText id="revelation.label">RÉVÉLATION</EditableText> · {moduleInfo.titre.toUpperCase()}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Intro */}
        <div className="text-center mb-12">
          <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}><EditableText id="revelation.eyebrow">Vos réponses, enfin réunies</EditableText></div>
          <h1 className="font-serif" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: 'var(--dark-paper)', lineHeight: 1.1, marginBottom: 14 }}>
            <EditableText id="revelation.titre">Moment de vérité ✦</EditableText>
          </h1>
          <p style={{ color: 'var(--dark-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
            <EditableText id="revelation.souscritre" multiline>Prenez le temps de lire ce que l&apos;autre a écrit. Sans juger. C&apos;est ça, se choisir.</EditableText>
          </p>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-8">
          {moduleInfo.questions.map((q) => {
            const myFmt = fmtAnswer(q, myMap[q.slug])
            const partnerFmt = fmtAnswer(q, partnerMap[q.slug])

            return (
              <div key={q.slug}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark-muted)', marginBottom: 14 }}>{q.texte}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: '16px 18px', border: '1px solid var(--dark-line)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="av av-c" style={{ width: 26, height: 26, fontSize: 11 }}>{(myName || 'M')[0]}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-muted)' }}>{myName || 'Toi'}</span>
                    </div>
                    <p style={{ fontSize: 14, color: myFmt ? 'var(--dark-paper)' : 'var(--dark-muted)', fontStyle: myFmt ? 'normal' : 'italic', lineHeight: 1.6 }}>
                      {myFmt || '— pas de réponse —'}
                    </p>
                  </div>
                  <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: '16px 18px', border: '1px solid var(--dark-line)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="av av-a" style={{ width: 26, height: 26, fontSize: 11 }}>{(partnerName || 'P')[0]}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-muted)' }}>{partnerName || 'Partenaire'}</span>
                    </div>
                    <p style={{ fontSize: 14, color: partnerFmt ? 'var(--dark-paper)' : 'var(--dark-muted)', fontStyle: partnerFmt ? 'normal' : 'italic', lineHeight: 1.6 }}>
                      {partnerFmt || '— pas de réponse —'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Conclusion */}
        <div className="text-center mt-14" style={{ borderTop: '1px solid var(--dark-line)', paddingTop: 48 }}>
          <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}><EditableText id="revelation.conclusion.eyebrow">Pour clore ce module</EditableText></div>
          <h2 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 700, color: 'var(--dark-paper)' }}>
            <EditableText id="revelation.conclusion.titre">Ta conclusion, de ton côté</EditableText>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--dark-muted)', marginBottom: 28, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            <EditableText id="revelation.conclusion.souscritre" multiline>Chacun·e écrit la sienne, sans regarder celle de l&apos;autre. Le module suivant se débloque quand vous avez toustes les deux terminé.</EditableText>
          </p>

          <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: 24, marginBottom: 20, textAlign: 'left', border: '1px solid var(--dark-line)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-muted)', display: 'block', marginBottom: 10 }}>
              <EditableText id="revelation.conclusion.apprentissage.label">Qu&apos;est-ce que tu as appris avec ce module ?</EditableText>
            </label>
            <textarea
              value={apprentissage}
              onChange={e => { setApprentissage(e.target.value); setSaved(false) }}
              disabled={revealed}
              placeholder="Ce que tu retiens…"
              rows={3}
              style={{ width: '100%', background: 'var(--dark)', border: '1.5px solid var(--dark-line)', borderRadius: 'var(--r-sm)', padding: '12px 16px', color: 'var(--dark-paper)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', opacity: revealed ? .8 : 1 }}
            />
          </div>

          <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: 24, marginBottom: 28, textAlign: 'left', border: '1px solid var(--dark-line)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-muted)', display: 'block', marginBottom: 10 }}>
              <EditableText id="revelation.conclusion.surprise.label">Qu&apos;est-ce qui t&apos;a surpris ?</EditableText>
            </label>
            <textarea
              value={surprise}
              onChange={e => { setSurprise(e.target.value); setSaved(false) }}
              disabled={revealed}
              placeholder="Ce que tu ne t'attendais pas à lire ou à ressentir…"
              rows={3}
              style={{ width: '100%', background: 'var(--dark)', border: '1.5px solid var(--dark-line)', borderRadius: 'var(--r-sm)', padding: '12px 16px', color: 'var(--dark-paper)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', opacity: revealed ? .8 : 1 }}
            />
          </div>

          {revealed ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-6" style={{ color: 'var(--sage)' }}>
                <CheckCircle className="w-5 h-5" />
                <span style={{ fontSize: 14, fontWeight: 600 }}><EditableText id="revelation.conclusion.scelle">Module scellé — vos deux conclusions sont dans le journal</EditableText></span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/journal" className="btn-ghost" style={{ borderColor: 'var(--dark-line)', color: 'var(--dark-paper)' }}>
                  <EditableText id="revelation.journal.voir">Voir le journal</EditableText>
                </Link>
                <Link href="/tableau-de-bord" className="btn-brand">
                  <EditableText id="revelation.suivant">Module suivant</EditableText> <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <button onClick={enregistrer} disabled={!canSave || isPending || saved}
                className="btn-brand lg"
                style={{ opacity: (!canSave || saved) ? .5 : 1 }}>
                {isPending
                  ? <EditableText id="revelation.conclusion.enregistrement">Enregistrement…</EditableText>
                  : saved
                  ? <EditableText id="revelation.conclusion.enregistree">Conclusion enregistrée ✓</EditableText>
                  : <EditableText id="revelation.conclusion.enregistrer">Enregistrer ma conclusion</EditableText>}
              </button>
              {saved && (
                <p className="font-mono mt-5" style={{ fontSize: 11, color: 'var(--dark-muted)' }}>
                  {partnerConclusionDone
                    ? <EditableText id="revelation.conclusion.attente.presque">En attente de la synchronisation…</EditableText>
                    : <>⏳ {partnerName || 'Ton/ta partenaire'} <EditableText id="revelation.conclusion.attente">n&apos;a pas encore écrit la sienne</EditableText></>}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
