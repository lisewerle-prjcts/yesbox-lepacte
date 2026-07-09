import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Eye, Lock, Unlock } from 'lucide-react'
import { adminViewAs, adminTogglePaye } from '@/app/actions/admin'
import AdminCoupleEditor from '@/components/admin/AdminCoupleEditor'

export const dynamic = 'force-dynamic'

const SLUGS = ['partenaire1','partenaire2','couple','quotidien','projets','famille','communication','disputes','cdd','bac']
const LABELS: Record<string,string> = {
  partenaire1:'M1', partenaire2:'M2', couple:'M3', quotidien:'M4', projets:'M5',
  famille:'M6', communication:'M7', disputes:'M8', cdd:'M9', bac:'M10',
}

const STATUS_COLOR: Record<string,string> = {
  locked: '#e6dfd1',
  en_cours: '#fceef4',
  complete: '#e2ece4',
  revealed: 'var(--sage)',
}
const STATUS_TEXT: Record<string,string> = {
  locked:'🔒',en_cours:'✏️',complete:'✓',revealed:'★'
}

export default async function AdminCouples() {
  const supabase = createAdminClient()

  const { data: couples } = await supabase.from('couples').select('id, created_at, nom_couple, prenom_partenaire1, prenom_partenaire2, a_paye').order('created_at', { ascending: false })
  if (!couples?.length) return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-6" style={{ color: 'var(--ink)' }}>Couples & progression</h1>
      <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun couple inscrit pour l&apos;instant.</div>
    </div>
  )

  const coupleIds = couples.map(c => c.id)

  const [{ data: profiles }, { data: modulesRaw }] = await Promise.all([
    supabase.from('profiles').select('id,prenom,email,couple_id,role').in('couple_id', coupleIds),
    supabase.from('modules').select('id,couple_id,slug,statut,revealed,completed_at,revealed_at').eq('cycle', 1).in('couple_id', coupleIds),
  ])

  const revealedIds = (modulesRaw || []).filter(m => m.revealed).map(m => m.id)
  const { data: scoresRaw } = revealedIds.length
    ? await supabase.from('scores').select('module_id,score').in('module_id', revealedIds)
    : { data: [] as { module_id: string; score: number }[] }

  const modules = (modulesRaw || []).map(m => ({
    ...m,
    scores: (scoresRaw || []).filter(s => s.module_id === m.id).map(s => s.score),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>Couples & progression</h1>
        <span className="tag-muted">{couples.length} couple{couples.length > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4">
        {couples.map(couple => {
          const members = (profiles || []).filter(p => p.couple_id === couple.id)
          const coupleModules = (modules || []).filter(m => m.couple_id === couple.id)
          const membre1 = members.find(m => m.role === 'initiateur')
          const membre2 = members.find(m => m.role === 'partenaire')
          const prenom1 = couple.prenom_partenaire1 || membre1?.prenom || null
          const prenom2 = couple.prenom_partenaire2 || membre2?.prenom || null
          const revealedCount = coupleModules.filter(m => m.revealed).length

          return (
            <div key={couple.id} className="card p-5">
              {/* En-tête couple */}
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--ink)' }}>
                      {couple.nom_couple || `${prenom1 || 'Partenaire 1'} & ${prenom2 || 'Partenaire 2'}`}
                    </span>
                    <span className="tag-muted" style={{ fontSize: 11 }}>{revealedCount}/{SLUGS.length} modules révélés</span>
                    {couple.a_paye
                      ? <span className="tag-sage" style={{ fontSize: 11 }}>✓ Accès complet payé</span>
                      : <span className="tag-muted" style={{ fontSize: 11 }}>Non payé</span>}
                  </div>
                  <div className="flex gap-4 flex-wrap mt-1.5">
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Partenaire 1 : <strong style={{ color: 'var(--ink-2)' }}>{prenom1 || 'pas encore inscrit·e'}</strong>
                      {membre1 && <span className="font-mono" style={{ fontSize: 10.5, marginLeft: 5 }}>({membre1.email})</span>}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Partenaire 2 : <strong style={{ color: 'var(--ink-2)' }}>{prenom2 || 'pas encore inscrit·e'}</strong>
                      {membre2 && <span className="font-mono" style={{ fontSize: 10.5, marginLeft: 5 }}>({membre2.email})</span>}
                    </span>
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Inscrit le {new Date(couple.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              {/* Grille modules */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {SLUGS.map(slug => {
                  const mod = coupleModules.find(m => m.slug === slug)
                  const st = mod?.statut || 'locked'
                  const bg = mod?.revealed ? STATUS_COLOR.revealed : STATUS_COLOR[st] || STATUS_COLOR.locked
                  return (
                    <div key={slug} className="rounded-lg p-2 text-center" style={{ background: bg, border: '1px solid rgba(0,0,0,.06)' }}>
                      <div className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{LABELS[slug]}</div>
                      <div style={{ fontSize: 16 }}>{STATUS_TEXT[mod?.revealed ? 'revealed' : st]}</div>
                      {mod?.scores && mod.scores.length > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--sage)', marginTop: 2 }}>{mod.scores.map(s => '★'.repeat(s)).join(' · ')}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Voir l'espace de chaque membre inscrit */}
              {members.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {members.map(member => (
                    <div key={member.id} className="surface p-3 flex items-center justify-between gap-2 flex-wrap">
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{member.prenom || member.email}</span>
                      <form action={adminViewAs.bind(null, member.id)}>
                        <button type="submit" className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: 'var(--brand-tint)', color: 'var(--brand)', border: '1px solid var(--brand-soft)' }}>
                          <Eye className="w-3 h-3" />Voir son espace
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions rapides */}
              {(() => {
                async function toggleP() {
                  'use server'
                  await adminTogglePaye(couple.id, !couple.a_paye)
                }
                return (
              <div className="mt-3 flex gap-2 flex-wrap items-start">
                <Link
                  href={`/admin/actions?couple_id=${couple.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--brand-tint)', color: 'var(--brand)', border: '1px solid var(--brand-soft)' }}
                >
                  Actions →
                </Link>
                <form action={toggleP}>
                  <button type="submit" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={couple.a_paye
                      ? { background: 'none', border: '1px solid #fca5a5', color: '#dc2626' }
                      : { background: 'var(--sage-soft)', color: 'var(--sage)', border: '1px solid var(--sage)' }}>
                    {couple.a_paye ? <><Lock className="w-3 h-3" />Marquer non payé</> : <><Unlock className="w-3 h-3" />Marquer comme payé</>}
                  </button>
                </form>
                <AdminCoupleEditor
                  coupleId={couple.id}
                  nomCoupleInitial={couple.nom_couple}
                  prenom1Initial={prenom1}
                  prenom2Initial={prenom2}
                  peutSupprimer={members.length === 0}
                />
              </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
