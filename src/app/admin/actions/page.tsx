import { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { chargerPersonnesSegment } from '@/lib/segments-donnees'
import { MODELES_EMAIL, modeleEmail } from '@/lib/modeles-email/catalogue'
import { relancesDemarragePrevues } from '@/lib/rappels-email'
import RattrapageRelances, { type LigneRattrapage } from './RattrapageRelances'
import { contenusModeles } from '@/lib/modeles-email/serveur'
import AdminActionsClient from './AdminActionsClient'
import ReglesEnvoi from '@/components/admin/ReglesEnvoi'
import SegmentClient from './SegmentClient'

// L'envoi à un segment part e-mail par e-mail : on laisse le temps.
export const maxDuration = 300

export default async function AdminActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ couple_id?: string }>
}) {
  const { couple_id } = await searchParams
  const supabase = createAdminClient()

  const { data: couples } = await supabase.from('couples').select('id,created_at,numero').order('created_at', { ascending: false })
  const { data: profiles } = await supabase.from('profiles').select('id,prenom,email,couple_id')
  const { data: precommandes } = await supabase.from('precommandes').select('id,prenom,email').order('created_at', { ascending: false })
  const { data: codes } = await supabase.from('codes_gratuits').select('code').order('created_at', { ascending: false })
  const effectiveModules = await getEffectiveModules()
  const personnes = await chargerPersonnesSegment(supabase)
  // Modèles d'e-mails automatiques (textes en vigueur) pour partir d'un modèle.
  const contenus = await contenusModeles()
  const modeles = MODELES_EMAIL.map(m => ({ cle: m.cle, famille: m.famille, nom: m.nom, ...contenus[m.cle] }))
  const modules = effectiveModules.map((m, i) => ({ slug: m.slug, name: `M${i + 1} — ${m.titre}` }))

  // Relances de démarrage dues aujourd'hui (aperçu du rattrapage).
  const numeros = new Map((couples || []).map(c => [c.id, c.numero as number | null]))
  const relances: LigneRattrapage[] = (await relancesDemarragePrevues(supabase)).map(r => ({
    coupleId: r.coupleId,
    couple: [`Couple ${numeros.get(r.coupleId) ?? '?'}`, r.membres.map(m => m.prenom || m.email).join(' & ')].join(' — '),
    situation: `${r.type === 'non_paire' ? 'Pas encore au complet' : 'Au complet, jamais commencé'} (palier ${r.jours} jours)`,
    email: modeleEmail(r.modele).nom,
    destinataires: r.membres.filter(m => m.rappels_email && m.email).map(m => m.email as string),
  }))

  const couplesWithMembers = (couples || []).map(c => ({
    ...c,
    members: (profiles || []).filter(p => p.couple_id === c.id),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Actions manuelles</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Débloquer/verrouiller des modules, envoyer des e-mails (écrits de zéro ou repris d’un e-mail automatique, en français, en anglais ou selon la langue de chaque personne), à une personne ou à un segment.</p>
      </div>
      <ReglesEnvoi />
      <RattrapageRelances lignes={relances} />
      <AdminActionsClient
        couples={couplesWithMembers}
        precommandes={precommandes || []}
        defaultCoupleId={couple_id}
        modules={modules}
        modeles={modeles}
      />
      <div className="mt-6">
        <SegmentClient
          personnes={personnes}
          codes={(codes || []).map(c => c.code)}
          modules={modules}
          modeles={modeles}
        />
      </div>
    </div>
  )
}
