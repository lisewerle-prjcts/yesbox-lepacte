import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import MemberPicker from './MemberPicker'
import { CheckCircle, Lock, Clock } from 'lucide-react'

interface Profile { id: string; prenom: string | null; email: string; couple_id: string | null; role: string | null }
interface ModuleRow { id: string; couple_id: string; slug: string; statut: string; revealed: boolean }
// Aucune valeur de réponse n'est lue ici : l'admin ne voit que la progression
// (RGPD — les réponses sont réservées au couple).
interface ReponseRow { module_id: string; user_id: string; question_slug: string }
interface JournalRow { module_slug: string; user_id: string; question_slug: string }

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
        Choisis un membre pour suivre sa progression. Le contenu des réponses et des conclusions n&apos;est jamais affiché : il reste réservé au couple.
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
    ? await supabase.from('modules').select('id, couple_id, slug, statut, revealed').eq('couple_id', member.couple_id)
    : { data: [] as ModuleRow[] }
  const modules = (modulesData || []) as ModuleRow[]

  const moduleIds = modules.map(m => m.id)
  const { data: reponsesData } = moduleIds.length
    ? await supabase.from('reponses').select('module_id, user_id, question_slug').in('module_id', moduleIds)
    : { data: [] as ReponseRow[] }
  const reponses = (reponsesData || []) as ReponseRow[]

  const { data: journalData } = member.couple_id
    ? await supabase.from('journal_entries').select('module_slug, user_id, question_slug').eq('couple_id', member.couple_id)
    : { data: [] as JournalRow[] }
  const journalEntries = (journalData || []) as JournalRow[]

  function reponsesFor(moduleId: string, uid: string) {
    return reponses.filter(r => r.module_id === moduleId && r.user_id === uid)
  }

  const done = modules.filter(m => m.revealed).length
  const effectiveModules = member.couple_id ? await getEffectiveModules() : []

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
          {member.couple_id && <> · {done}/{effectiveModules.length} modules révélés</>}
        </p>
      </div>

      {!member.couple_id ? (
        <div className="card p-8 text-center" style={{ color: 'var(--muted)', fontSize: 14 }}>
          Ce membre n&apos;est pas encore pairé avec un·e partenaire.
        </div>
      ) : (
        <div className="space-y-5">
          {effectiveModules.map(moduleInfo => {
            const modData = modules.find(m => m.slug === moduleInfo.slug)
            const statutKey = modData?.revealed ? 'revealed' : (modData?.statut || 'locked')
            const status = STATUS_LABEL[statutKey] || STATUS_LABEL.locked
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
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[member, ...(partner ? [partner] : [])].map(p => {
                    const repondues = modData ? new Set(reponsesFor(modData.id, p.id).map(r => r.question_slug)) : new Set<string>()
                    const nbRepondues = moduleInfo.questions.filter(q => repondues.has(q.slug)).length
                    const conclusionEcrite = journalEntries.some(e => e.module_slug === moduleInfo.slug && e.user_id === p.id)
                    return (
                      <div key={p.id} className="surface p-3">
                        <p className="font-semibold" style={{ fontSize: 11, color: p.id === member.id ? 'var(--brand)' : 'var(--muted)', marginBottom: 4 }}>{p.prenom || p.email}</p>
                        <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{nbRepondues}/{moduleInfo.questions.length} questions répondues</p>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Conclusion : {conclusionEcrite ? 'écrite' : 'pas encore'}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
