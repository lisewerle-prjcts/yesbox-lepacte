import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Espaces réservés aux couples connectés, admin et API : rien à indexer.
const PRIVE = [
  '/admin', '/api/', '/auth/', '/tableau-de-bord', '/module/', '/pacte', '/journal',
  '/mon-compte', '/rdv-annuels', '/regles-du-jeu', '/consentement', '/abonnement',
  '/rejoindre', '/desinscription', '/nouveau-mot-de-passe', '/reset-password',
  '/offrir/carte/', '/offrir/merci',
]

// Robots des moteurs de réponse IA, autorisés explicitement : un groupe
// nommé remplace le groupe « * » pour ce robot, d'où la même liste PRIVE.
const ROBOTS_IA = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVE },
      { userAgent: ROBOTS_IA, allow: '/', disallow: PRIVE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
