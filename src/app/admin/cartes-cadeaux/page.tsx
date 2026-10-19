import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import type { CarteCadeau } from '@/lib/cartes-cadeaux'

export const dynamic = 'force-dynamic'

function date(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' })
}

function montant(c: CarteCadeau) {
  if (c.montant_centimes === null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (c.devise ?? 'eur').toUpperCase() }).format(c.montant_centimes / 100)
}

// Toutes les cartes cadeaux vendues sur /offrir : code, date d'achat et
// utilisation (lecture seule, les cartes sont créées par le paiement Stripe).
export default async function AdminCartesCadeauxPage() {
  const admin = createAdminClient()
  const { data, error } = await admin.from('cartes_cadeaux').select('*').order('achete_le', { ascending: false })
  const cartes = (data ?? []) as CarteCadeau[]

  const coupleIds = [...new Set(cartes.map(c => c.utilise_par_couple_id).filter((id): id is string => !!id))]
  const numeros = new Map<string, number>()
  if (coupleIds.length) {
    const { data: couples } = await admin.from('couples').select('id, numero').in('id', coupleIds)
    for (const c of couples ?? []) numeros.set(c.id, c.numero)
  }

  const maintenant = Date.now()
  const utilisees = cartes.filter(c => c.utilise_le).length
  const expirees = cartes.filter(c => !c.utilise_le && new Date(c.expire_le).getTime() <= maintenant).length
  const totalCentimes = cartes.reduce((s, c) => s + (c.montant_centimes ?? 0), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Cartes cadeaux</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Cartes achetées sur la page <Link href="/offrir" style={{ color: 'var(--brand)' }}>Offrir</Link> : chaque code (YES-XXXX-XXXX) est valable 1 an après l&apos;achat et utilisable par un seul couple.
        </p>
      </div>

      {error && (
        <div className="card p-4 mb-6" style={{ borderColor: '#dc2626', background: '#fef2f2', fontSize: 13.5, color: '#991b1b' }}>
          Impossible de lire les cartes cadeaux : {error.message}. As-tu exécuté le bloc « CARTES CADEAUX » de supabase/schema.sql ?
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['Cartes vendues', String(cartes.length)],
          ['Utilisées', String(utilisees)],
          ['Non utilisées', String(cartes.length - utilisees - expirees)],
          ['Montant total', new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalCentimes / 100)],
        ].map(([libelle, valeur]) => (
          <div key={libelle} className="card p-4">
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{libelle}</div>
            <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--ink)' }}>{valeur}</div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        {cartes.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Aucune carte cadeau vendue pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Durée</th>
                  <th className="py-2 pr-3">Acheté le</th>
                  <th className="py-2 pr-3">Montant</th>
                  <th className="py-2 pr-3">Acheteur</th>
                  <th className="py-2 pr-3">Destination</th>
                  <th className="py-2 pr-3">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {cartes.map(c => {
                  const expiree = !c.utilise_le && new Date(c.expire_le).getTime() <= maintenant
                  const numero = c.utilise_par_couple_id ? numeros.get(c.utilise_par_couple_id) : undefined
                  return (
                    <tr key={c.id} className="border-b align-top">
                      <td className="py-2 pr-3 font-mono font-semibold whitespace-nowrap">
                        <Link href={`/offrir/carte/${c.code}`} target="_blank" style={{ color: 'var(--ink)' }}>{c.code}</Link>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{c.duree_mois} mois</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{date(c.achete_le)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{montant(c)}</td>
                      <td className="py-2 pr-3 text-gray-600">{c.acheteur_email ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-600">
                        {c.pour_soi ? 'Pour son propre couple' : 'Cadeau pour un couple'}
                        {c.pour_qui && <div className="text-xs text-gray-400">Pour : {c.pour_qui}</div>}
                        {c.de_la_part_de && <div className="text-xs text-gray-400">De la part de : {c.de_la_part_de}</div>}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {c.utilise_le ? (
                          <span className="tag-sage">Utilisé le {date(c.utilise_le)}{numero !== undefined ? ` · couple n°${numero}` : ''}</span>
                        ) : expiree ? (
                          <span className="tag-muted">Expiré le {date(c.expire_le)}</span>
                        ) : (
                          <span className="tag-brand">Non utilisé · jusqu&apos;au {date(c.expire_le)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
