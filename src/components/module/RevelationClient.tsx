'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, CheckCircle } from 'lucide-react'
import { sauvegarderConclusion } from '@/app/actions/journal'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import GrilleComparaison from '@/components/module/GrilleComparaison'
import ReponsesCoteACote from '@/components/module/ReponsesCoteACote'
import { isConclusionAnswered, parseChoixMultiple, serializeChoixMultiple } from '@/lib/questions'
import { conclusionDuModule } from '@/lib/modules-data'

// Modules 2 à 7 : même explication avant la conclusion.
const MODULES_CONCLUSION_STANDARD = ['nous', 'quotidien', 'projets', 'famille', 'communication', 'intimite']
import type { ConclusionTexte, ModuleInfo, Module, Reponse } from '@/types'

interface ConclusionRow { question_slug: string; valeur: string | null }

interface Props {
  moduleInfo: ModuleInfo
  moduleData: Module
  mesReponses: Reponse[]
  // Vide tant que les deux n'ont pas répondu à toutes les questions.
  reponsesPartner: Reponse[]
  reponsesPartagees: boolean
  myName: string | null
  partnerName: string | null
  coupleId: string
  maConclusion: ConclusionRow[]
  partenaireConclusionFaite: boolean
}

function getConclusion(rows: ConclusionRow[], slug: 'apprentissage' | 'surprise'): string {
  return rows.find(r => r.question_slug === slug)?.valeur ?? ''
}

const styleChamp = { width: '100%', background: 'var(--dark)', border: '1.5px solid var(--dark-line)', borderRadius: 'var(--r-sm)', padding: '12px 16px', color: 'var(--dark-paper)', fontSize: 14, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit' }

// Réponse à une question de conclusion : texte libre, ou cases à cocher
// (+ champ « autre ») quand la question a des options.
function ChampConclusion({ c, value, onChange, disabled }: { c: ConclusionTexte; value: string; onChange: (v: string) => void; disabled: boolean }) {
  if (!c.options) {
    return <textarea value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={c.placeholder} rows={3}
      style={{ ...styleChamp, opacity: disabled ? .8 : 1 }} />
  }
  const { choix, autre } = parseChoixMultiple(value)
  return (
    <div className="flex flex-col gap-2.5" style={{ opacity: disabled ? .8 : 1 }}>
      {c.options.map((opt, i) => {
        const isOn = choix.includes(i)
        return (
          <button key={i} type="button" aria-pressed={isOn} disabled={disabled} onClick={() => {
            const next = isOn ? choix.filter(x => x !== i) : [...choix, i].sort((a, b) => a - b)
            onChange(serializeChoixMultiple({ choix: next, autre }))
          }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all text-sm font-medium"
            style={{
              background: 'var(--dark)',
              border: `1.5px solid ${isOn ? 'var(--brand)' : 'var(--dark-line)'}`,
              color: 'var(--dark-paper)',
            }}>
            <span className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center"
              style={{ borderColor: isOn ? 'var(--brand)' : 'var(--dark-muted)', background: isOn ? 'var(--brand)' : 'transparent' }}>
              {isOn && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
            {opt}
          </button>
        )
      })}
      {c.autre && (
        <label className="flex flex-col gap-2 mt-2">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-muted)' }}>{c.autre}</span>
          <textarea value={autre} onChange={e => onChange(serializeChoixMultiple({ choix, autre: e.target.value }))}
            disabled={disabled} rows={3} style={styleChamp} />
        </label>
      )}
    </div>
  )
}

export default function RevelationClient({ moduleInfo, moduleData, mesReponses, reponsesPartner, reponsesPartagees, myName, partnerName, coupleId, maConclusion, partenaireConclusionFaite }: Props) {
  const router = useRouter()
  const t = useT()
  const [isPending, startTransition] = useTransition()
  const [apprentissage, setApprentissage] = useState(() => getConclusion(maConclusion, 'apprentissage'))
  const [surprise, setSurprise] = useState(() => getConclusion(maConclusion, 'surprise'))
  const [saved, setSaved] = useState(() => !!(getConclusion(maConclusion, 'apprentissage') && getConclusion(maConclusion, 'surprise')))
  // `revealedLocal` couvre la personne qui scelle le module ; `moduleData.revealed`
  // (rafraîchi par router.refresh) couvre celle qui attendait l'autre.
  const [revealedLocal, setRevealed] = useState(false)
  const revealed = moduleData.revealed || revealedLocal
  // Module scellé : la conclusion reste modifiable, `modifiee` signale des
  // changements pas encore enregistrés.
  const [modifiee, setModifiee] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const myMap: Record<string, string> = {}
  mesReponses.forEach(r => { if (r.valeur) myMap[r.question_slug] = r.valeur })
  const partnerMap: Record<string, string> = {}
  reponsesPartner.forEach(r => { if (r.valeur) partnerMap[r.question_slug] = r.valeur })

  // Tant que l'autre n'a pas terminé ses réponses, cette page sert d'aperçu :
  // on peut encore modifier les siennes, et la conclusion (qui peut sceller le
  // module) n'est pas encore proposée.
  // La conclusion ne s'écrit qu'une fois que les deux ont tout répondu.
  const partnerDone = reponsesPartagees
  const conclusion = conclusionDuModule(moduleInfo)

  const partnerConclusionDone = partenaireConclusionFaite

  const canSave = isConclusionAnswered(conclusion.apprentissage, apprentissage) && isConclusionAnswered(conclusion.surprise, surprise)

  // Ma conclusion est enregistrée, celle de l'autre pas encore (ou le module
  // n'est pas encore scellé) : on rafraîchit régulièrement pour que le bouton
  // « Module suivant » apparaisse aussi de ce côté-ci sans recharger la page.
  const enAttente = partnerDone && saved && !revealed
  useEffect(() => {
    if (!enAttente) return
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh() }
    const timer = setInterval(refresh, 5000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [enAttente, router])

  async function enregistrer() {
    if (!canSave) return
    setErreur(null)
    startTransition(async () => {
      const result = await sauvegarderConclusion(coupleId, moduleData.id, moduleInfo.slug, apprentissage, surprise)
      if ('error' in result && result.error) setErreur(result.error)
      if (result.success) {
        setSaved(true)
        setModifiee(false)
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
            {partnerDone
              ? <EditableText id="revelation.souscritre" multiline>Prenez le temps de lire ce que l&apos;autre a écrit. Sans juger.</EditableText>
              : <EditableText id="revelation.souscritre.enattente" multiline>Tant que l&apos;autre n&apos;a pas répondu, tu peux encore modifier. Ensuite, prenez le temps de lire ce que l&apos;autre a écrit. Sans juger.</EditableText>}
          </p>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-8">
          {moduleInfo.questions.map((q) => {
            if (q.type === 'grille') {
              return (
                <div key={q.slug}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark-muted)', marginBottom: 14, whiteSpace: 'pre-line' }}>{q.texte}</p>
                  <GrilleComparaison
                    q={q}
                    maValeur={myMap[q.slug]}
                    valeurAutre={partnerMap[q.slug]}
                    monNom={myName || t('Toi', 'You')}
                    nomAutre={partnerName || t('Partenaire', 'Partner')}
                    sansReponse={t('—', '—')}
                    libelleDifferent={t('Réponses différentes', 'Different answers')}
                    theme="dark"
                  />
                  <p style={{ fontSize: 12, color: 'var(--dark-muted)', marginTop: 8 }}>
                    <span style={{ color: 'var(--brand)' }}>●</span> <EditableText id="revelation.grille.legende">Vos réponses diffèrent sur cette tâche</EditableText>
                  </p>
                </div>
              )
            }

            return (
              <ReponsesCoteACote key={q.slug} q={q} maValeur={myMap[q.slug]} valeurAutre={partnerMap[q.slug]}
                myName={myName} partnerName={partnerName} reponsesPartagees={reponsesPartagees} />
            )
          })}
        </div>

        {/* Conclusion */}
        {!partnerDone ? (
          <div className="text-center mt-14" style={{ borderTop: '1px solid var(--dark-line)', paddingTop: 48 }}>
            <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}><EditableText id="revelation.attente.eyebrow">Pas encore</EditableText></div>
            <h2 className="font-serif mb-2" style={{ fontSize: 26, fontWeight: 700, color: 'var(--dark-paper)' }}>
              <EditableText id="revelation.attente.titre">Il manque les réponses de</EditableText> {partnerName || t('ton/ta partenaire', 'your partner')}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--dark-muted)', marginBottom: 28, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              <EditableText id="revelation.attente.texte" multiline>Tu pourras rédiger ta conclusion une fois que vous aurez tous les deux répondu. En attendant, tu peux encore revoir ou modifier tes réponses.</EditableText>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/module/${moduleInfo.slug}`} className="btn-brand"><EditableText id="revelation.attente.modifier">Modifier mes réponses</EditableText></Link>
              <Link href="/tableau-de-bord" className="btn-ghost" style={{ borderColor: 'var(--dark-line)', color: 'var(--dark-paper)' }}>
                <EditableText id="revelation.retour.dashboard">Retour au tableau de bord</EditableText>
              </Link>
            </div>
          </div>
        ) : (
        <div id="conclusion" className="text-center mt-14" style={{ borderTop: '1px solid var(--dark-line)', paddingTop: 48 }}>
          <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}><EditableText id="revelation.conclusion.eyebrow">Pour clore ce module</EditableText></div>
          <h2 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 700, color: 'var(--dark-paper)' }}>
            <EditableText id="revelation.conclusion.titre">Ta conclusion, de ton côté</EditableText>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--dark-muted)', marginBottom: 28, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            {(() => {
              // Explication propre à chaque étape du parcours ; les modules non
              // listés (pacte, rendez-vous annuel, modules personnalisés) gardent
              // le texte général.
              const debut = "Écris ici ta conclusion. Découvre ensuite celle de l'autre. Elles seront toutes les deux compilées sur la page « Notre Pacte » : note bien tout ce que tu veux garder en mémoire au moment de rédiger votre pacte."
              if (moduleInfo.slug === 'toi') {
                return <EditableText id="revelation.conclusion.souscritre.premier.v2" multiline>{`${debut} Une fois vos conclusions écrites, et avec votre YES BOX, le module suivant se débloque.`}</EditableText>
              }
              if (moduleInfo.slug === 'conflits') {
                return <EditableText id="revelation.conclusion.souscritre.avantpacte" multiline>{`${debut} Il est maintenant temps de passer au module final, celui de votre pacte de couple.`}</EditableText>
              }
              if (MODULES_CONCLUSION_STANDARD.includes(moduleInfo.slug)) {
                return <EditableText id="revelation.conclusion.souscritre.parcours" multiline>{`${debut} Une fois vos conclusions écrites, le module suivant se débloque.`}</EditableText>
              }
              return <EditableText id="revelation.conclusion.souscritre" multiline>Chacun·e écrit la sienne, sans regarder celle de l&apos;autre. Le module suivant se débloque quand vous deux avez inscrit un élément dans votre journal.</EditableText>
            })()}
          </p>

          <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: 24, marginBottom: 20, textAlign: 'left', border: '1px solid var(--dark-line)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-muted)', display: 'block', marginBottom: 10 }}>
              <EditableText id={`revelation.conclusion.${moduleInfo.slug}.apprentissage.label`}>{conclusion.apprentissage.label}</EditableText>
            </label>
            {conclusion.apprentissage.aide && (
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--dark-muted)', opacity: .85, marginTop: -4, marginBottom: 12 }}>
                <EditableText id={`revelation.conclusion.${moduleInfo.slug}.apprentissage.aide`} multiline>{conclusion.apprentissage.aide}</EditableText>
              </p>
            )}
            <ChampConclusion c={conclusion.apprentissage} value={apprentissage} onChange={v => { setApprentissage(v); setSaved(false); setModifiee(true) }} disabled={false} />
          </div>

          <div style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: 24, marginBottom: 28, textAlign: 'left', border: '1px solid var(--dark-line)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-muted)', display: 'block', marginBottom: 10 }}>
              <EditableText id={`revelation.conclusion.${moduleInfo.slug}.surprise.label`}>{conclusion.surprise.label}</EditableText>
            </label>
            {conclusion.surprise.aide && (
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--dark-muted)', opacity: .85, marginTop: -4, marginBottom: 12 }}>
                <EditableText id={`revelation.conclusion.${moduleInfo.slug}.surprise.aide`} multiline>{conclusion.surprise.aide}</EditableText>
              </p>
            )}
            <ChampConclusion c={conclusion.surprise} value={surprise} onChange={v => { setSurprise(v); setSaved(false); setModifiee(true) }} disabled={false} />
          </div>

          {erreur && <p className="mb-4" style={{ fontSize: 13, color: '#f5a3a3' }}>{erreur}</p>}
          {revealed ? (
            <>
              {modifiee ? (
                <div className="mb-6">
                  <button onClick={enregistrer} disabled={!canSave || isPending} className="btn-brand lg" style={{ opacity: canSave ? 1 : .5 }}>
                    {isPending
                      ? <EditableText id="revelation.conclusion.enregistrement">Enregistrement…</EditableText>
                      : <EditableText id="revelation.conclusion.modifier">Enregistrer mes modifications</EditableText>}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-2" style={{ color: 'var(--sage)' }}>
                  <CheckCircle className="w-5 h-5" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}><EditableText id="revelation.conclusion.scelle">Module scellé — vos deux conclusions sont dans le journal</EditableText></span>
                </div>
              )}
              {!modifiee && (
                <p className="mb-6" style={{ fontSize: 12.5, color: 'var(--dark-muted)' }}>
                  <EditableText id="revelation.conclusion.modifiable" multiline>Envie d’ajouter quelque chose après en avoir parlé ? Tu peux compléter ta conclusion à tout moment.</EditableText>
                </p>
              )}
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
                    : <>⏳ {partnerName || t('Ton/ta partenaire', 'Your partner')} <EditableText id="revelation.conclusion.attente">n&apos;a pas encore écrit la sienne</EditableText></>}
                </p>
              )}
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
