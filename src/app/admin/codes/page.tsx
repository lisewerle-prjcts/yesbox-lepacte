import { createAdminClient } from '@/lib/supabase/server'
import CodesGratuitsClient from './CodesGratuitsClient'

export default async function AdminCodesPage() {
  const admin = createAdminClient()
  const { data: codes } = await admin
    .from('codes_gratuits')
    .select('id, code, offre, duree_mois, montant_centimes, actif_jusqu_au, usages_max, usages, actif, note, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Codes gratuits</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Distribue des codes donnant le pack initial offert, un accès complet gratuit, ou une réduction d&apos;un montant en euros sur le prochain paiement (pack initial ou rendez-vous annuel, 0,50 € minimum restant à payer). Un couple ne peut utiliser qu&apos;un seul code.
        </p>
      </div>
      <CodesGratuitsClient codes={codes || []} />
    </div>
  )
}
