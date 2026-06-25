import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const SLUGS = ['moi','toi','nous','communication','conflits','engagement','renouvellement']
const LABELS: Record<string,string> = {
  moi:'M1',toi:'M2',nous:'M3',communication:'M4',conflits:'M5',engagement:'M6',renouvellement:'M7'
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
  const supabase = await createClient()

  const { data: couples } = await supabase.from('couples').select('id, created_at').order('created_at', { ascending: false })
  if (!couples?.length) return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-6" style={{ color: 'var(--ink)' }}>Couples & progression</h1>
      <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>Aucun couple inscrit pour l&apos;instant.</div>
    </div>
  )

  const coupleIds = couples.map(c => c.id)

  const [{ data: profiles }, { data: modules }] = await Promise.all([
    supabase.from('profiles').select('id,prenom,email,couple_id').in('couple_id', coupleIds),
    supabase.from('modules').select('couple_id,slug,statut,revealed,connivence_score,completed_at,revealed_at').in('couple_id', coupleIds),
  ])

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

          return (
            <div key={couple.id} className="card p-5">
              {/* En-tête couple */}
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {members.map(m => (
                      <span key={m.id} className="font-semibold" style={{ fontSize: 15 }}>{m.prenom || '—'}</span>
                    )).reduce((acc: React.ReactNode[], el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} style={{ color: 'var(--muted)' }}>&</span>, el], [])}
                  </div>
                  <div className="flex gap-3 flex-wrap mt-1">
                    {members.map(m => (
                      <span key={m.id} className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{m.email}</span>
                    ))}
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Inscrit le {new Date(couple.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              {/* Grille modules */}
              <div className="grid grid-cols-7 gap-2">
                {SLUGS.map(slug => {
                  const mod = coupleModules.find(m => m.slug === slug)
                  const st = mod?.statut || 'locked'
                  const bg = mod?.revealed ? STATUS_COLOR.revealed : STATUS_COLOR[st] || STATUS_COLOR.locked
                  return (
                    <div key={slug} className="rounded-lg p-2 text-center" style={{ background: bg, border: '1px solid rgba(0,0,0,.06)' }}>
                      <div className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{LABELS[slug]}</div>
                      <div style={{ fontSize: 16 }}>{STATUS_TEXT[mod?.revealed ? 'revealed' : st]}</div>
                      {mod?.connivence_score && (
                        <div style={{ fontSize: 9, color: 'var(--sage)', marginTop: 2 }}>{'★'.repeat(mod.connivence_score)}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Progression membres */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {members.map(member => {
                  const memberModules = coupleModules.filter(m =>
                    m.statut === 'complete' || m.statut === 'revealed' || m.revealed
                  )
                  const done = memberModules.length
                  return (
                    <div key={member.id} className="surface p-3 flex items-center justify-between">
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{member.prenom || member.email}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done}/7 modules</span>
                    </div>
                  )
                })}
              </div>

              {/* Actions rapides */}
              <div className="mt-3 flex gap-2 flex-wrap">
                <Link
                  href={`/admin/actions?couple_id=${couple.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--brand-tint)', color: 'var(--brand)', border: '1px solid var(--brand-soft)' }}
                >
                  Actions →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
