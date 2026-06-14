import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/tableau-de-bord', '/module/', '/pacte', '/journal', '/inviter-partenaire'],
    },
    sitemap: 'https://yesbox-lepacte.fr/sitemap.xml',
  }
}
