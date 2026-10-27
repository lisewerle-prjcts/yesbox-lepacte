// Conseil affiché à l'inscription selon le domaine de l'adresse : certains
// fournisseurs (NetZero…) et les messageries d'entreprise filtrent
// beaucoup les e-mails d'expéditeurs qu'ils ne connaissent pas encore.

// Messageries personnelles courantes : aucun conseil.
const PERSONNELLES = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
  'yahoo.com', 'yahoo.fr', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr',
  'neuf.fr', 'laposte.net', 'bbox.fr', 'numericable.fr', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.fr', 'gmx.com', 'gmx.de',
  'aol.com', 'aol.fr', 'tutanota.com', 'tuta.io', 'skynet.be', 'telenet.be', 'bluewin.ch', 'videotron.ca', 'sympatico.ca',
])

// Fournisseurs qui retiennent ou retardent souvent nos e-mails.
const STRICTES = new Set(['netzero.net', 'netzero.com', 'juno.com', 'earthlink.net'])

export type ConseilAdresse = 'stricte' | 'professionnelle' | null

export function conseilAdresse(email: string): ConseilAdresse {
  const domaine = email.trim().toLowerCase().split('@')[1]
  if (!domaine || !domaine.includes('.')) return null
  if (STRICTES.has(domaine)) return 'stricte'
  if (PERSONNELLES.has(domaine)) return null
  return 'professionnelle'
}
