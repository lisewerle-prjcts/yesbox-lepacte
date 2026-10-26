import type { Metadata } from 'next'
import { getSiteContentMap } from '@/lib/site-content'
import { faqPage, jsonLd, produit } from '@/lib/donnees-structurees'
import AccueilClient from './AccueilClient'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default async function Accueil() {
  const contenu = await getSiteContentMap()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(produit)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqPage(contenu))} />
      <AccueilClient />
    </>
  )
}
