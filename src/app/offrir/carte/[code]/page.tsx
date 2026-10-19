import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { normaliserCodeCadeau } from '@/lib/cartes-cadeaux'
import { getLocale, getT } from '@/lib/i18n/server'
import BoutonImprimer from './BoutonImprimer'
import CarteCadeauImprimable from './CarteCadeauImprimable'

export const metadata: Metadata = {
  title: 'Carte cadeau',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Carte cadeau à imprimer (format A5 paysage), reprenant le modèle
// « Carte cadeau — YES BOX ». Accessible avec le code lui-même : c'est ce
// que la personne qui offre transmet au couple.
export default async function CarteCadeauPage({ params }: { params: Promise<{ code: string }> }) {
  const locale = await getLocale()
  const t = getT(locale)
  const code = normaliserCodeCadeau(decodeURIComponent((await params).code))
  if (!code) notFound()

  const { data: carte } = await createAdminClient()
    .from('cartes_cadeaux')
    .select('code, duree_mois, pour_soi, de_la_part_de, pour_qui, expire_le')
    .eq('code', code)
    .maybeSingle()
  if (!carte) notFound()

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--cream)' }}>

      <div className="pas-imprime max-w-3xl mx-auto mb-6 text-center">
        <BoutonImprimer />
        <p className="mt-2" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {t('Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » pour télécharger la carte, ou votre imprimante (format A5 paysage, ou A4 en ajustant à la page).',
            'In the window that opens, choose "Save as PDF" to download the card, or your printer (A5 landscape, or A4 with fit to page).')}
        </p>
        <p className="mt-1" style={{ fontSize: 12.5 }}><Link href="/offrir" style={{ color: 'var(--brand)' }}>← {t('Offrir une autre carte', 'Give another card')}</Link></p>
      </div>

      <CarteCadeauImprimable carte={carte} locale={locale} />
    </div>
  )
}
