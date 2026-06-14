import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import type { Module } from '@/types'

export const metadata = { title: 'Journal de couple' }

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const [{ data: modules }, { data: entries }] = await Promise.all([
    supabase.from('modules').select('*').eq('couple_id', profile.couple_id),
    supabase.from('journal_entries').select('*').eq('couple_id', profile.couple_id),
  ])

  const revealedModules = (modules || []).filter((m: Module) => m.revealed)

  return (
    <div className="fade" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-tint)' }}>
          <BookOpen className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Journal de couple</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Vos conclusions après chaque révélation</p>
        </div>
      </div>

      {revealedModules.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-4">📓</div>
          <h2 className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Pas encore d'entrées</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Le journal se remplit après chaque session de révélation.</p>
          <Link href="/tableau-de-bord" className="btn-brand">Aller aux modules</Link>
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
                      <p className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}>{moduleInfo.titre}</p>
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>{moduleInfo.sousTitre}</p>
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
                    <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Aucune conclusion rédigée pour ce module.</p>
                    <Link href={`/module/${moduleInfo.slug}/revelation`} style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
                      Ajouter une conclusion →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
