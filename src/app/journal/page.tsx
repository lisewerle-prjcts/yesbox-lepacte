import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getLocale, getT } from '@/lib/i18n/server'
import { localizeModules } from '@/lib/i18n/module-text'
import { conclusionDuModule } from '@/lib/modules-data'
import { formatAnswer, formatConclusion } from '@/lib/questions'
import Link from 'next/link'
import EditableText from '@/components/edit-mode/EditableText'
import SignaturePacte from './SignaturePacte'
import OffreRdvAnnuel from '@/components/OffreRdvAnnuel'
import { lireFormule, offreRdvAnnuel } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'
import { MODULE_PACTE, MODULE_RDV_ANNUEL } from '@/lib/progression'
import { bornesRdvAnnuel, anniversaireDansBornes, saintValentinDansBornes } from '@/lib/rdv-annuel'
import { BookOpen, PartyPopper, PenLine, UserPlus } from 'lucide-react'
import type { Module } from '@/types'
import { dechiffrerLignes } from '@/lib/chiffrement'

export const metadata = { title: 'Notre Pacte' }

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const locale = await getLocale()
  const t = getT(locale)
  const [{ data: modules }, { data: entries }, { data: partner }, { data: signature }, effectiveModules] = await Promise.all([
    supabase.from('modules').select('*').eq('couple_id', profile.couple_id),
    supabase.from('journal_entries').select('*').eq('couple_id', profile.couple_id),
    supabase.from('profiles').select('prenom, id').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
    // Requête à part : si les colonnes de signature manquent en base, le
    // texte du pacte s'affiche quand même.
    supabase.from('couples').select('date_anniversaire, pacte_signe_le, rdv_annuel_le').eq('id', profile.couple_id).single(),
    getEffectiveModules(),
  ])
  const [{ data: coupleAbonnement }, formule, { data: avis }] = await Promise.all([
    supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single(),
    lireFormule(supabase, profile.couple_id),
    createAdminClient().from('avis').select('id').eq('profile_id', user.id).maybeSingle(),
  ])
  const offreAnnuelle = offreRdvAnnuel(coupleAbonnement, formule, !!signature?.pacte_signe_le)
  // Bascule vers l'abonnement annuel programmée d'office à la signature.
  const basculeProgrammee = offreAnnuelle.mensuelEnCours && !!formule.annuelPrevuLe
  const MODULES = localizeModules(effectiveModules, locale)
  const entriesClaires = dechiffrerLignes(entries as { module_slug: string; user_id: string; question_slug: string; valeur: string | null }[] | null)

  const revealedModules = (modules || []).filter((m: Module) => m.revealed)
  // Le pacte se signe dès la fin du module 9 (le module 10, rendez-vous annuel,
  // se fait un an plus tard).
  const modulePacte = (modules || []).find((m: Module) => m.slug === MODULE_PACTE)
  const pacteTermine = !!modulePacte?.revealed
  const moduleRdv = (modules || []).find((m: Module) => m.slug === MODULE_RDV_ANNUEL)
  const rdvOuvert = !!moduleRdv && (moduleRdv.statut !== 'locked' || moduleRdv.revealed)
  const bornesRdv = bornesRdvAnnuel()

  // Réponses du module 9 (le pacte), affichées comme les conclusions des
  // autres modules une fois le pacte signé par les deux.
  const { data: reponsesPacteBrutes } = pacteTermine && modulePacte
    ? await createAdminClient().from('reponses').select('user_id, question_slug, valeur').eq('module_id', modulePacte.id)
    : { data: [] as { user_id: string; question_slug: string; valeur: string | null }[] }
  const reponsesPacte = dechiffrerLignes(reponsesPacteBrutes)
  function getReponsePacte(userId: string, questionSlug: string): string | undefined {
    return reponsesPacte.find(r => r.user_id === userId && r.question_slug === questionSlug)?.valeur ?? undefined
  }

  function getConclusion(moduleSlug: string, userId: string, questionSlug: 'apprentissage' | 'surprise'): string {
    return entriesClaires.find(e => e.module_slug === moduleSlug && e.user_id === userId && e.question_slug === questionSlug)?.valeur || ''
  }

  return (
    <div className="fade" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-tint)' }}>
          <BookOpen className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}><EditableText id="journal.titre">Notre Pacte</EditableText></h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id="journal.souscritre.v3" multiline>Les réponses finales des 8 modules, et vos réponses au module du pacte, qui constituent votre pacte. Chacun·e peut compléter ses réponses finales à tout moment.</EditableText></p>
        </div>
      </div>

      {!partner && (
        <div className="card p-5 mb-6 flex flex-wrap items-center gap-4" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
          <UserPlus className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1, minWidth: 200 }}>
            <EditableText id="journal.nonpaire.texte" multiline>Votre journal et votre Pacte se remplissent une fois vos deux comptes pairés.</EditableText>
          </p>
          <Link href="/tableau-de-bord" className="btn-brand text-sm py-2"><EditableText id="journal.nonpaire.cta">Retrouver mon code couple</EditableText></Link>
        </div>
      )}

      {partner && !pacteTermine && (
        <div className="card p-5 mb-6 flex items-center gap-3" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
          <PenLine className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
            <EditableText id="journal.pacte.attente" multiline>Votre pacte s&apos;affichera ici quand vous aurez terminé le programme.</EditableText>
          </p>
        </div>
      )}

      {partner && pacteTermine && (
        <div className="card p-6 mb-6" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
          <div className="flex items-center gap-2 mb-3">
            <PartyPopper className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <h2 className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}>
              <EditableText id="journal.parcours.termine.titre">Parcours initial terminé</EditableText>
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            <EditableText id="journal.parcours.termine.texte.v2" multiline>Bravo pour tout ce chemin parcouru ensemble ! Vous recevrez des messages régulièrement tout au long de l’année (2 par mois maximum) pour continuer à renforcer votre couple, jusqu’à la date de rendez-vous que vous avez fixée. Ce jour-là, un module spécial vous attendra, et nous vous guiderons en amont pour préparer ce moment comme il se doit. À bientôt, et prenez soin de vous et de votre couple.</EditableText>
          </p>
          {basculeProgrammee && (
            <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6, marginTop: 12 }}>
              <EditableText id="journal.parcours.termine.bascule" multiline>À la fin de votre mois d’abonnement, vous passerez automatiquement à l’abonnement annuel (19 €/an), sans démarche de votre part. Vous recevrez un e-mail quelques jours avant, et vous pouvez annuler ce passage depuis Mon compte.</EditableText>
            </p>
          )}
        </div>
      )}

      {revealedModules.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-4">📓</div>
          <h2 className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}><EditableText id="journal.vide.titre">Pas encore d&apos;entrées</EditableText></h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}><EditableText id="journal.vide.texte" multiline>Le journal se remplit après chaque session de révélation.</EditableText></p>
          <Link href="/tableau-de-bord" className="btn-brand"><EditableText id="journal.vide.cta">Aller aux modules</EditableText></Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Du plus récent au plus ancien : le pacte (module 9) en haut, le module 1 en bas. */}
          {[...MODULES].sort((a, b) => b.n - a.n).map(moduleInfo => {
            const modData = revealedModules.find(m => m.slug === moduleInfo.slug)
            if (!modData) return null

            // Le module 9 se termine par la signature du pacte, sans conclusion :
            // on y reprend ses réponses, question par question.
            const questions = moduleInfo.slug === MODULE_PACTE
              ? moduleInfo.questions.map(q => ({
                  slug: q.slug,
                  label: q.texte,
                  editableId: null as string | null,
                  moi: formatAnswer(q, getReponsePacte(user.id, q.slug)) ?? '—',
                  autre: partner ? formatAnswer(q, getReponsePacte(partner.id, q.slug)) ?? '—' : '',
                }))
              : (() => {
                  const conclusion = conclusionDuModule(moduleInfo)
                  return (['apprentissage', 'surprise'] as const).map(slug => ({
                    slug: slug as string,
                    label: conclusion[slug].label,
                    editableId: `revelation.conclusion.${moduleInfo.slug}.${slug}.label` as string | null,
                    moi: formatConclusion(conclusion[slug], getConclusion(moduleInfo.slug, user.id, slug)),
                    autre: partner ? formatConclusion(conclusion[slug], getConclusion(moduleInfo.slug, partner.id, slug)) : '',
                  }))
                })()

            return (
              <section key={moduleInfo.slug} className="card p-6" aria-labelledby={`journal-${moduleInfo.slug}`}>
                <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 22 }}>{moduleInfo.emoji}</span>
                  <div>
                    <h2 id={`journal-${moduleInfo.slug}`} className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}>
                      {t('Module', 'Module')} {moduleInfo.n}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id={`module.${moduleInfo.slug}.titre`}>{moduleInfo.titre}</EditableText></p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {questions.map(q => (
                    <div key={q.slug}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 10, whiteSpace: 'pre-line' }}>
                        {q.editableId ? <EditableText id={q.editableId}>{q.label}</EditableText> : q.label}
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '12px 16px', borderLeft: '3px solid var(--brand)' }}>
                          <p className="font-semibold" style={{ fontSize: 12, color: 'var(--brand)', marginBottom: 4 }}>{profile.prenom || t('Toi', 'You')}</p>
                          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic', whiteSpace: 'pre-line' }}>« {q.moi} »</p>
                          {moduleInfo.slug !== MODULE_PACTE && (
                            <Link href={`/module/${moduleInfo.slug}/revelation#conclusion`} className="inline-flex items-center gap-1 mt-2" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>
                              <PenLine className="w-3 h-3" /> <EditableText id="journal.conclusion.modifier">Compléter ma réponse</EditableText>
                            </Link>
                          )}
                        </div>
                        {partner && (
                          <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '12px 16px' }}>
                            <p className="font-semibold" style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>{partner.prenom || t('Partenaire', 'Partner')}</p>
                            <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic', whiteSpace: 'pre-line' }}>« {q.autre} »</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {pacteTermine && partner && (
        <SignaturePacte
          signeLe={signature?.pacte_signe_le ?? null}
          rdvLe={signature?.rdv_annuel_le ?? null}
          rdvOuvert={rdvOuvert}
          min={bornesRdv.min}
          max={bornesRdv.max}
          parDefaut={bornesRdv.parDefaut}
          anniversaire={anniversaireDansBornes(signature?.date_anniversaire ?? null)}
          saintValentin={saintValentinDansBornes()}
          avisDonne={!!avis}
        />
      )}

      {/* Une fois le pacte signé : proposer « Pacte – notre rendez-vous annuel ». */}
      {offreAnnuelle.afficher && <OffreRdvAnnuel mensuelEnCours={offreAnnuelle.mensuelEnCours} finPeriode={coupleAbonnement?.subscription_current_period_end ?? null} />}
    </div>
  )
}
