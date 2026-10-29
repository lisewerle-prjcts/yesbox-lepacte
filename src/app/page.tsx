import type { Metadata } from 'next'
import { getSiteContentMap } from '@/lib/site-content'
import { createAdminClient } from '@/lib/supabase/server'
import { chargerAvisPublies } from '@/lib/avis'
import { faqPage, jsonLd, produit } from '@/lib/donnees-structurees'
import AccueilClient from './AccueilClient'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default async function Accueil() {
  const [contenu, avis] = await Promise.all([getSiteContentMap(), chargerAvisPublies(createAdminClient())])
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(produit(avis))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqPage(contenu))} />
      <AccueilClient avis={avis} />
    </>
  )
}
