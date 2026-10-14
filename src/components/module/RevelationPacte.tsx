'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarHeart, CheckCircle, Heart } from 'lucide-react'
import { signerPacteModule } from '@/app/actions/journal'
import EditableText from '@/components/edit-mode/EditableText'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import ChoixDateRdv, { formaterDate, type BornesRdv } from '@/components/pacte/ChoixDateRdv'
import { formatAnswer } from '@/lib/questions'
import type { ModuleInfo, Reponse } from '@/types'

interface Props {
  moduleInfo: ModuleInfo
  moduleId: string
  mesReponses: Reponse[]
  // Vide tant que les deux n'ont pas répondu à toutes les questions.
  reponsesPartner: Reponse[]
  reponsesPartagees: boolean
  revealed: boolean
  myName: string | null
  partnerName: string | null
  jaiSigne: boolean
  partenaireASigne: boolean
  signeLe: string | null
  rdvLe: string | null
  bornes: BornesRdv
}

// Module 9 : pas de conclusion. Les réponses de chacun·e s'affichent dans un
// encadré, puis les deux signent le pacte (et choisissent la date du
// rendez-vous annuel). Quand les deux ont signé, le module est terminé.
export default function RevelationPacte({ moduleInfo, moduleId, mesReponses, reponsesPartner, reponsesPartagees, revealed, myName, partnerName, jaiSigne, partenaireASigne, signeLe, rdvLe, bornes }: Props) {
  const router = useRouter()
  const t = useT()
  const { locale } = useLocale()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const nomPartenaire = partnerName || t('Ton/ta partenaire', 'Your partner')

  // J'ai signé, l'autre pas encore : on rafraîchit régulièrement pour voir
  // le pacte terminé sans recharger la page.
  const enAttente = jaiSigne && !revealed
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

  function signer() {
    if (!date) return
    setErreur('')
    startTransition(async () => {
      const res = await signerPacteModule(moduleId, date)
      if (res.error) { setErreur(res.error); return }
      router.refresh()
    })
  }

  function Encadre({ nom, reponses, accent }: { nom: string; reponses: Reponse[]; accent: boolean }) {
    const map: Record<string, string> = {}
    reponses.forEach(r => { if (r.valeur) map[r.question_slug] = r.valeur })
    return (
      <section style={{ background: 'var(--dark-2)', borderRadius: 'var(--r)', padding: 24, border: '1px solid var(--dark-line)', borderLeft: accent ? '3px solid var(--brand)' : '1px solid var(--dark-line)' }}>
        <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--dark-paper)', marginBottom: 18 }}>{nom}</h2>
        <div className="flex flex-col gap-5">
          {moduleInfo.questions.map(q => (
            <div key={q.slug}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--dark-muted)', lineHeight: 1.5, marginBottom: 6, whiteSpace: 'pre-line' }}>{q.texte}</p>
              <p style={{ fontSize: 15, color: 'var(--dark-paper)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {formatAnswer(q, map[q.slug]) ?? <span style={{ color: 'var(--dark-muted)' }}>—</span>}
              </p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'var(--font-geist)' }}>
      <div style={{ borderBottom: '1px solid var(--dark-line)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 860, margin: '0 auto' }}>
        <Link href="/tableau-de-bord" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--dark-muted)' }}>
          <ArrowLeft className="w-4 h-4" /><EditableText id="revelation.retour">Tableau de bord</EditableText>
        </Link>
        <div className="font-mono text-xs font-bold" style={{ color: 'var(--dark-muted)', letterSpacing: '.1em' }}>
          {moduleInfo.titre.toUpperCase()}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div className="text-center mb-10">
          <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}><EditableText id="pacte.module.eyebrow">Votre pacte de couple</EditableText></div>
          <h1 className="font-serif" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: 'var(--dark-paper)', lineHeight: 1.1, marginBottom: 14 }}>
            <EditableText id="pacte.module.titre">Vos engagements ✦</EditableText>
          </h1>
          <p style={{ color: 'var(--dark-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
            {reponsesPartagees
              ? <EditableText id="pacte.module.souscritre" multiline>Prenez le temps de lire ce que l&apos;autre a écrit. Sans juger.</EditableText>
              : <EditableText id="revelation.souscritre.enattente" multiline>Tant que l&apos;autre n&apos;a pas répondu, tu peux encore modifier. Ensuite, prenez le temps de lire ce que l&apos;autre a écrit. Sans juger.</EditableText>}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Encadre nom={myName || t('Toi', 'You')} reponses={mesReponses} accent />
          {reponsesPartagees && <Encadre nom={nomPartenaire} reponses={reponsesPartner} accent={false} />}
        </div>

        {!reponsesPartagees ? (
          <div className="text-center mt-14" style={{ borderTop: '1px solid var(--dark-line)', paddingTop: 48 }}>
            <h2 className="font-serif mb-2" style={{ fontSize: 26, fontWeight: 700, color: 'var(--dark-paper)' }}>
              <EditableText id="revelation.attente.titre">Il manque les réponses de</EditableText> {partnerName || t('ton/ta partenaire', 'your partner')}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--dark-muted)', marginBottom: 28, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              <EditableText id="pacte.module.attente.texte" multiline>Vous pourrez signer votre pacte une fois que vous aurez répondu l&apos;un·e et l&apos;autre. En attendant, tu peux encore revoir ou modifier tes réponses.</EditableText>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/module/${moduleInfo.slug}`} className="btn-brand"><EditableText id="revelation.attente.modifier">Modifier mes réponses</EditableText></Link>
              <Link href="/tableau-de-bord" className="btn-ghost" style={{ borderColor: 'var(--dark-line)', color: 'var(--dark-paper)' }}>
                <EditableText id="revelation.retour.dashboard">Retour au tableau de bord</EditableText>
              </Link>
            </div>
          </div>
        ) : (
          <div className="card text-center mt-14" style={{ padding: '40px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💍</div>
            <h2 className="font-serif font-bold" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 12 }}>
              {revealed
                ? <EditableText id="pacte.signe.titre">Votre Pacte est signé</EditableText>
                : <EditableText id="pacte.signature.titre">Signez votre Pacte</EditableText>}
            </h2>

            {revealed ? (
              <>
                {signeLe && (
                  <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
                    {t(`Signé le ${formaterDate(signeLe.slice(0, 10), locale)}.`, `Signed on ${formaterDate(signeLe.slice(0, 10), locale)}.`)}
                  </p>
                )}
                {rdvLe && (
                  <p className="flex items-center justify-center gap-2" style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600, marginTop: 12 }}>
                    <CalendarHeart className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                    {t(`Votre bilan annuel de couple : le ${formaterDate(rdvLe, locale)}`, `Your yearly couple review: ${formaterDate(rdvLe, locale)}`)}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ marginTop: 28 }}>
                  <Link href="/journal" className="btn-secondary"><EditableText id="pacte.module.voirpacte">Voir notre pacte</EditableText></Link>
                  <Link href="/tableau-de-bord" className="btn-brand"><EditableText id="revelation.retour.dashboard">Retour au tableau de bord</EditableText></Link>
                </div>
              </>
            ) : jaiSigne ? (
              <>
                <p className="flex items-center justify-center gap-2" style={{ color: 'var(--sage)', fontWeight: 600, marginBottom: 8 }}>
                  <CheckCircle className="w-5 h-5" /><EditableText id="pacte.module.jaisigne">Tu as signé votre pacte</EditableText>
                </p>
                {rdvLe && (
                  <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
                    {t(`Date choisie pour votre bilan annuel : le ${formaterDate(rdvLe, locale)}.`, `Date chosen for your yearly review: ${formaterDate(rdvLe, locale)}.`)}
                  </p>
                )}
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
                  ⏳ <EditableText id="pacte.module.attente.signature">En attente de la signature de</EditableText> {nomPartenaire}
                </p>
              </>
            ) : (
              <>
                {partenaireASigne && (
                  <p className="flex items-center justify-center gap-2" style={{ color: 'var(--sage)', fontWeight: 600, marginBottom: 20 }}>
                    <CheckCircle className="w-5 h-5" />{nomPartenaire} <EditableText id="pacte.module.partenairesigne">a signé votre pacte</EditableText>
                  </p>
                )}

                <ChoixDateRdv bornes={bornes} rdvLe={rdvLe} onDate={setDate} />

                <div style={{ maxWidth: 460, margin: '32px auto 0' }}>
                  <p className="font-serif" style={{ fontSize: 19, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 8 }}>
                    <EditableText id="pacte.module.yeux" multiline>Regarde l&apos;autre dans les yeux et dis-lui : « Je m&apos;engage avec toi et je t&apos;aime. »</EditableText>
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
                    <EditableText id="pacte.module.cliquer">Puis clique sur le bouton de signature.</EditableText>
                  </p>
                  {erreur && <p role="alert" style={{ fontSize: 13, color: 'var(--brand-deep)', marginBottom: 12 }}>{erreur}</p>}
                  <button
                    type="button"
                    onClick={signer}
                    disabled={isPending || !date}
                    className="btn-brand"
                    style={{ padding: '16px 32px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: !date ? .5 : 1 }}
                  >
                    <Heart className="w-5 h-5" />
                    {isPending ? t('Signature…', 'Signing…') : <EditableText id="pacte.signature.cta">Signer notre Pacte</EditableText>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
