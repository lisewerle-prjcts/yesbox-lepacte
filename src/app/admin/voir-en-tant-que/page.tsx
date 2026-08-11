import { createAdminClient } from '@/lib/supabase/server'
import { MODULES } from '@/lib/modules-data'
import MemberPicker from './MemberPicker'
import { CheckCircle, Lock, Clock } from 'lucide-react'

interface Profile { id: string; prenom: string | null; email: string; couple_id: string | null; role: string | null }
interface ModuleRow { id: string; couple_id: string; slug: string; statut: string; revealed: boolean; connivence_score: number | null }
interface ReponseRow { id: string; module_id: string; user_id: string; question_slug: string; valeur: string | null }
interface JournalRow { module_slug: string; contenu: string }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  revealed: { label: 'Révélé', color: 'var(--sage)' },
  complete: { label: 'Terminé · en attente de révélation', color: 'var(--brand)' },
  en_cours: { label: 'En cours', color: 'var(--brand)' },
  locked: { label: 'Verrouillé', color: 'var(--muted)' },
}

export default async function VoirEnTantQuePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const { userId } = await searchParams
  const supabase = createAdminClient()

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, prenom, email, couple_id, role')
    .order('email')
  const profiles = (profilesData || []) as Profile[]

  const header = (
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Voir en tant que</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)' }}>
        Choisis un membre pour visualiser son espace exactement comme il/elle le voit — en lecture seule.
      </p>
    </div>
  )

  const member = userId ? profiles.find(p => p.id === userId) : undefined

  if (!userId || !member) {
    return (
      <div>
        {header}
        {userId && !member && (
          <div className="alert-error mb-4" style={{ fontSize: 13 }}>Membre introuvable.</div>
        )}
        <div className="card p-5">
          <MemberPicker profiles={profiles} />
        </div>
      </div>
    )
  }

  const partner = member.couple_id
    ? profiles.find(p => p.couple_id === member.couple_id && p.id !== member.id) || null
    : null

  const { data: couple } = member.couple_id
    ? await supabase.from('couples').select('numero').eq('id', member.couple_id).single()
    : { data: null }

  const { data: modulesData } = member.couple_id
    ? await supabase.from('modules').select('id, couple_id, slug, statut, revealed, connivence_score').eq('couple_id', member.couple_id)
    : { data: [] as ModuleRow[] }
  const modules = (modulesData || []) as ModuleRow[]

  const moduleIds = modules.map(m => m.id)
  const { data: reponsesData } = moduleIds.length
    ? await supabase.from('reponses').select('id, module_id, user_id, question_slug, valeur').in('module_id', moduleIds)
    : { data: [] as ReponseRow[] }
  const reponses = (reponsesData || []) as ReponseRow[]

  const { data: journalData } = member.couple_id
    ? await supabase.from('journal_entries').select('module_slug, contenu').eq('couple_id', member.couple_id)
    : { data: [] as JournalRow[] }
  const journalEntries = (journalData || []) as JournalRow[]

  function reponsesFor(moduleId: string, uid: string) {
    return reponses.filter(r => r.module_id === moduleId && r.user_id === uid)
  }

  const done = modules.filter(m => m.revealed).length

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        {header}
        <MemberPicker profiles={profiles} defaultUserId={userId} />
      </div>

      <div className="card p-5 mb-6" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
        <p className="font-semibold" style={{ fontSize: 15, color: 'var(--ink)' }}>
          👁️ {member.prenom || member.email}
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
          {member.email}
          {couple && <> · Couple {couple.numero}</>}
          {partner && <> · avec {partner.prenom || partner.email}</>}
          {member.couple_id && <> · {done}/7 modules révélés</>}
        </p>
      </div>

      {!member.couple_id ? (
        <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>
          Ce membre n&apos;est pas encore pairé avec un·e partenaire.
        </div>
      ) : (
        <div className="space-y-5">
          {MODULES.map(moduleInfo => {
            const modData = modules.find(m => m.slug === moduleInfo.slug)
            const statutKey = modData?.revealed ? 'revealed' : (modData?.statut || 'locked')
            const status = STATUS_LABEL[statutKey] || STATUS_LABEL.locked
            const mesReponses = modData ? reponsesFor(modData.id, member.id) : []
            const reponsesPartner = modData && partner && modData.revealed ? reponsesFor(modData.id, partner.id) : []
            const entry = journalEntries.find(e => e.module_slug === moduleInfo.slug)

            return (
              <div key={moduleInfo.slug} className="card p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 22 }}>{moduleInfo.emoji}</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}>{moduleInfo.titre}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{moduleInfo.sousTitre}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: status.color, background: 'var(--paper)', border: `1px solid ${status.color}` }}>
                    {statutKey === 'revealed' && <CheckCircle className="w-3 h-3" />}
                    {statutKey === 'en_cours' && <Clock className="w-3 h-3" />}
                    {statutKey === 'locked' && <Lock className="w-3 h-3" />}
                    {status.label}
                  </span>
                  {modData?.connivence_score && (
                    <span style={{ color: 'var(--brand)', fontSize: 13 }}>{'★'.repeat(modData.connivence_score)}{'☆'.repeat(5 - modData.connivence_score)}</span>
                  )}
                </div>

                {mesReponses.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Pas encore de réponses de ce membre pour ce module.</p>
                ) : (
                  <div className="space-y-4">
                    {moduleInfo.questions.map(question => {
                      const maReponse = mesReponses.find(r => r.question_slug === question.slug)
                      const reponsePartner = reponsesPartner.find(r => r.question_slug === question.slug)
                      if (!maReponse && !modData?.revealed) return null
                      return (
                        <div key={question.slug}>
                          <p className="font-semibold" style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>{question.texte}</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="surface p-3">
                              <p className="font-semibold" style={{ fontSize: 11, color: 'var(--brand)', marginBottom: 4 }}>{member.prenom || 'Ce membre'}</p>
                              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                                {maReponse?.valeur || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Sans réponse</span>}
                              </p>
                            </div>
                            {partner && (
                              <div className="surface p-3">
                                <p className="font-semibold" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{partner.prenom || 'Partenaire'}</p>
                                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                                  {modData?.revealed
                                    ? (reponsePartner?.valeur || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Sans réponse</span>)
                                    : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>En attente de la révélation</span>}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {entry?.contenu && (
                  <div className="mt-4" style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '14px 16px', borderLeft: '3px solid var(--brand)' }}>
                    <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Journal</p>
                    <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic' }}>« {entry.contenu} »</p>
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
