import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getLocale, getT } from '@/lib/i18n/server'
import { localizeModules } from '@/lib/i18n/module-text'
import { conclusionDuModule } from '@/lib/modules-data'
import Link from 'next/link'
import EditableText from '@/components/edit-mode/EditableText'
import PacteDocument from './PacteDocument'
import { BookOpen, Heart, UserPlus } from 'lucide-react'
import type { Module } from '@/types'

export const metadata = { title: 'Notre Pacte' }

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const locale = await getLocale()
  const t = getT(locale)
  const [{ data: modules }, { data: entries }, { data: partner }, { data: couple }, effectiveModules] = await Promise.all([
    supabase.from('modules').select('*').eq('couple_id', profile.couple_id),
    supabase.from('journal_entries').select('*').eq('couple_id', profile.couple_id),
    supabase.from('profiles').select('prenom, id').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
    supabase.from('couples').select('pacte_texte, pacte_modifie_le, pacte_modifie_par').eq('id', profile.couple_id).single(),
    getEffectiveModules(),
  ])
  const MODULES = localizeModules(effectiveModules, locale)

  const revealedModules = (modules || []).filter((m: Module) => m.revealed)
  const modulesTermines = (modules || []).filter((m: Module) => m.statut === 'complete')
  const tousTermines = modulesTermines.length === MODULES.length

  function getConclusion(moduleSlug: string, userId: string, questionSlug: 'apprentissage' | 'surprise'): string {
    return entries?.find(e => e.module_slug === moduleSlug && e.user_id === userId && e.question_slug === questionSlug)?.valeur || ''
  }

  const modifiePartPrenom = couple?.pacte_modifie_par === user.id
    ? (profile.prenom || t('Toi', 'You'))
    : (couple?.pacte_modifie_par ? (partner?.prenom || t('Ton/ta partenaire', 'Your partner')) : null)

  return (
    <div className="fade" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-tint)' }}>
          <BookOpen className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}><EditableText id="journal.titre">Notre Pacte</EditableText></h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id="journal.souscritre">Vos conclusions après chaque révélation</EditableText></p>
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

      {partner && revealedModules.length > 0 && (
        <PacteDocument
          initialTexte={couple?.pacte_texte ?? ''}
          modifiePar={modifiePartPrenom}
          modifieLe={couple?.pacte_modifie_le ?? null}
        />
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
          {MODULES.map(moduleInfo => {
            const modData = revealedModules.find(m => m.slug === moduleInfo.slug)
            if (!modData) return null

            const conclusion = conclusionDuModule(moduleInfo)
            const questions = (['apprentissage', 'surprise'] as const).map(slug => ({
              slug,
              label: conclusion[slug].label,
              moi: getConclusion(moduleInfo.slug, user.id, slug),
              autre: partner ? getConclusion(moduleInfo.slug, partner.id, slug) : '',
            }))

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
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 10 }}>
                        <EditableText id={`revelation.conclusion.${moduleInfo.slug}.${q.slug}.label`}>{q.label}</EditableText>
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '12px 16px', borderLeft: '3px solid var(--brand)' }}>
                          <p className="font-semibold" style={{ fontSize: 12, color: 'var(--brand)', marginBottom: 4 }}>{profile.prenom || t('Toi', 'You')}</p>
                          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic' }}>« {q.moi} »</p>
                        </div>
                        {partner && (
                          <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '12px 16px' }}>
                            <p className="font-semibold" style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>{partner.prenom || t('Partenaire', 'Partner')}</p>
                            <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic' }}>« {q.autre} »</p>
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

      {tousTermines && (
        <div className="card p-5 text-center" style={{ marginTop: 24, paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💍</div>
          <h2 className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 12 }}>
            <EditableText id="pacte.signature.titre">Signez votre Pacte</EditableText>
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto 24px' }}>
            <EditableText id="pacte.signature.texte" multiline>En signant, vous vous engagez à honorer les valeurs et accords explorés ensemble.</EditableText>
          </p>
          <button className="btn-brand" style={{ padding: '16px 32px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Heart className="w-5 h-5" />
            <EditableText id="pacte.signature.cta">Signer notre Pacte</EditableText>
          </button>
        </div>
      )}
    </div>
  )
}
