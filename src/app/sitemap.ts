import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://yesbox-lepacte.fr', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://yesbox-lepacte.fr/tarifs', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://yesbox-lepacte.fr/inscription', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://yesbox-lepacte.fr/connexion', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]
}
