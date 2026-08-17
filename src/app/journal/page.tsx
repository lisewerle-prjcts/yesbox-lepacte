import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import Link from 'next/link'
import EditableText from '@/components/edit-mode/EditableText'
import PacteDocument from './PacteDocument'
import { BookOpen, Heart } from 'lucide-react'
import type { Module } from '@/types'

export const metadata = { title: 'Notre Pacte' }

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('couple_id, prenom').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const [{ data: modules }, { data: entries }, { data: partner }, { data: couple }, MODULES] = await Promise.all([
    supabase.from('modules').select('*').eq('couple_id', profile.couple_id),
    supabase.from('journal_entries').select('*').eq('couple_id', profile.couple_id),
    supabase.from('profiles').select('prenom, id').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
    supabase.from('couples').select('pacte_texte, pacte_modifie_le, pacte_modifie_par').eq('id', profile.couple_id).single(),
    getEffectiveModules(),
  ])

  const revealedModules = (modules || []).filter((m: Module) => m.revealed)
  const modulesTermines = (modules || []).filter((m: Module) => m.statut === 'complete')
  const tousTermines = modulesTermines.length === MODULES.length

  const modifiePartPrenom = couple?.pacte_modifie_par === user.id
    ? (profile.prenom || 'Toi')
    : (couple?.pacte_modifie_par ? (partner?.prenom || 'Ton/ta partenaire') : null)

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

      {partner && (
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
            const entry = entries?.find(e => e.module_slug === moduleInfo.slug)
            return (
              <div key={moduleInfo.slug} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 22 }}>{moduleInfo.emoji}</span>
                    <div>
                      <p className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}><EditableText id={`module.${moduleInfo.slug}.titre`}>{moduleInfo.titre}</EditableText></p>
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id={`module.${moduleInfo.slug}.sousTitre`}>{moduleInfo.sousTitre}</EditableText></p>
                    </div>
                  </div>
                  {modData.connivence_score && (
                    <div className="flex items-center gap-1" style={{ fontSize: 13 }}>
                      <span style={{ color: 'var(--brand)' }}>{'★'.repeat(modData.connivence_score)}{'☆'.repeat(5 - modData.connivence_score)}</span>
                    </div>
                  )}
                </div>
                {entry?.contenu ? (
                  <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '14px 16px', borderLeft: '3px solid var(--brand)' }}>
                    <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, fontStyle: 'italic' }}>« {entry.contenu} »</p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}><EditableText id="journal.aucuneconclusion">Aucune conclusion rédigée pour ce module.</EditableText></p>
                    <Link href={`/module/${moduleInfo.slug}/revelation`} style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
                      <EditableText id="journal.ajouterconclusion">Ajouter une conclusion →</EditableText>
                    </Link>
                  </div>
                )}
              </div>
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
