import { SITE_URL } from '@/lib/site'
import { FAQ } from '@/lib/faq'
import { AVIS_ACCUEIL, type ResumeAvis } from '@/lib/avis-constantes'
import { PAYS_DU_MONDE } from '@/lib/pays'

// Données structurées (JSON-LD, schema.org) : elles décrivent noir sur blanc
// qui édite le site et ce qui y est vendu, pour Google, Bing et les IA.
// Prix identiques à ceux de OffresTarifs.

const ORGANISATION_ID = `${SITE_URL}/#organisation`

export const organisation = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANISATION_ID,
  name: 'YES BOX',
  alternateName: 'YES BOX — Le Pacte',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-yesbox.svg`,
  email: 'lise.yesbox@gmail.com',
}

export const siteWeb = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#site`,
  name: 'YES BOX — Le Pacte',
  url: SITE_URL,
  inLanguage: 'fr-FR',
  publisher: { '@id': ORGANISATION_ID },
}

// Programme en ligne, sans envoi physique : accès ouvert dès l'inscription
// ou le paiement, donc livraison gratuite et immédiate, dans tous les pays.
const livraison = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'EUR' },
  shippingDestination: PAYS_DU_MONDE.map(pays => ({ '@type': 'DefinedRegion', addressCountry: pays })),
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
  },
}

// Pas de retour : pour payer, on demande l'accès immédiat et on renonce au
// droit de rétractation dès cet accès (CGV, article 5 ; L221-28 du Code de
// la consommation).
// Google accepte 50 pays au plus par politique : une politique identique
// par groupe de 50 pays.
const politiqueRetour = Array.from({ length: Math.ceil(PAYS_DU_MONDE.length / 50) }, (_, i) => ({
  '@type': 'MerchantReturnPolicy',
  applicableCountry: PAYS_DU_MONDE.slice(i * 50, i * 50 + 50),
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
}))

const produitBase = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${SITE_URL}/#produit`,
  name: 'YES BOX — Le Pacte',
  description: 'Programme en ligne pour les couples : 8 modules de questions auxquelles chaque partenaire répond de son côté, une révélation des réponses à deux, puis la rédaction et la signature d’un pacte de couple, et un rendez-vous chaque année. Sans thérapeute et sans intelligence artificielle.',
  brand: { '@type': 'Brand', name: 'YES BOX' },
  image: `${SITE_URL}/opengraph-image`,
  url: SITE_URL,
  offers: [
    {
      '@type': 'Offer',
      name: 'Module 1 gratuit',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/inscription`,
      shippingDetails: livraison,
      hasMerchantReturnPolicy: politiqueRetour,
    },
    {
      '@type': 'Offer',
      name: 'Pack initial : les 8 modules et la signature du pacte',
      price: '58',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/tarifs`,
      shippingDetails: livraison,
      hasMerchantReturnPolicy: politiqueRetour,
    },
    {
      '@type': 'Offer',
      name: 'Pacte – notre rendez-vous annuel (abonnement facultatif, sans engagement)',
      price: '19',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/tarifs`,
      shippingDetails: livraison,
      hasMerchantReturnPolicy: politiqueRetour,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '19',
        priceCurrency: 'EUR',
        billingDuration: 'P1Y',
        unitCode: 'ANN',
      },
    },
  ],
}

/**
 * Produit, avec la note moyenne et les avis publiés (validés dans Admin >
 * Vue d'ensemble > Tâches) quand il y en a : Google n'affiche les étoiles
 * qu'avec aggregateRating et review, qui doivent correspondre aux avis
 * visibles sur la page.
 */
export function produit(avis: ResumeAvis) {
  if (!avis.nombre || avis.moyenne === null) return produitBase
  return {
    ...produitBase,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avis.moyenne,
      bestRating: 5,
      worstRating: 1,
      ratingCount: avis.nombre,
      reviewCount: avis.nombre,
    },
    review: avis.avis.slice(0, AVIS_ACCUEIL).map(a => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: a.prenom },
      datePublished: a.publieLe.slice(0, 10),
      reviewBody: a.texte,
      reviewRating: { '@type': 'Rating', ratingValue: a.note, bestRating: 5, worstRating: 1 },
    })),
  }
}

/** FAQ de l'accueil, avec les textes modifiés depuis l'admin s'il y en a. */
export function faqPage(contenu: Record<string, string>) {
  const fr = (texte: string) => texte
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ(fr).map((item, i) => ({
      '@type': 'Question',
      name: contenu[`home.faq.${i}.q`] || item.q,
      acceptedAnswer: { '@type': 'Answer', text: contenu[`home.faq.${i}.r`] || item.r },
    })),
  }
}

/** Contenu d'une balise <script type="application/ld+json">, `<` échappé. */
export function jsonLd(donnees: object) {
  return { __html: JSON.stringify(donnees).replace(/</g, '\\u003c') }
}
