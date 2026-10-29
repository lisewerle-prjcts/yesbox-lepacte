import type { Metadata } from 'next'
import { getSiteContentMap } from '@/lib/site-content'
import { createAdminClient } from '@/lib/supabase/server'
import { chargerAvisPublies } from '@/lib/avis'
import { faqPage, jsonLd, produit } from '@/lib/donnees-structurees'
import { pageThematique, type PageThematique } from '@/lib/pages-thematiques'
import AccueilClient from '@/app/AccueilClient'

// Routes des pages thématiques (/jeu-de-couple, /therapie-de-couple,
// /pacte-de-couple) : tout l'accueil, avec leur titre et leur contenu.

export function metadataThematique(slug: PageThematique['slug']): Metadata {
  const page = pageThematique(slug)
  return {
    title: { absolute: `${page.metaTitre} | YES BOX` },
    description: page.metaDescription,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: page.metaTitre, description: page.metaDescription, url: `/${slug}` },
  }
}

export async function RoutePageThematique({ slug }: { slug: PageThematique['slug'] }) {
  const page = pageThematique(slug)
  const [contenu, avis] = await Promise.all([getSiteContentMap(), chargerAvisPublies(createAdminClient())])
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(produit(avis))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqPage(contenu, page))} />
      <AccueilClient avis={avis} page={page} />
    </>
  )
}
